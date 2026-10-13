import { prisma } from '@/lib/prisma'

const TOKEN_URL = 'https://secure.stitch.money/connect/token'
const GRAPHQL_URL = 'https://api.stitch.money/graphql'

type StitchPaymentRequest = {
  id: string
  url: string
}

export class StitchCheckoutError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'StitchCheckoutError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isStitchConfigured() {
  return process.env.STITCH_ENABLED === 'true' &&
    Boolean(process.env.STITCH_CLIENT_ID && process.env.STITCH_CLIENT_SECRET && process.env.STITCH_WEBHOOK_SECRET) &&
    (process.env.STITCH_ENV === 'test' || process.env.STITCH_ENV === 'live')
}

async function getClientToken() {
  const clientId = process.env.STITCH_CLIENT_ID?.trim()
  const clientSecret = process.env.STITCH_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) {
    throw new StitchCheckoutError('STITCH_CREDENTIALS_MISSING', 'Stitch client credentials are missing on the staging server.')
  }

const form = new URLSearchParams({
  grant_type: 'client_credentials',
  client_id: clientId,
  client_secret: clientSecret,
  scope: 'client_paymentrequest',
  audience: 'https://secure.stitch.money/connect/token',
})

  let response: Response
  try {
    response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      signal: AbortSignal.timeout(15000),
    })
  } catch {
    throw new StitchCheckoutError('STITCH_TOKEN_CONNECTION_FAILED', 'Could not connect to Stitch to authenticate the payment request.')
  }
  let result: unknown
  try {
    result = await response.json()
  } catch {
    throw new StitchCheckoutError('STITCH_TOKEN_RESPONSE_INVALID', 'Stitch returned an unreadable authentication response.')
  }
  if (!response.ok || !isRecord(result) || typeof result.access_token !== 'string') {
    const oauthError = typeof result === 'object' && result !== null && 'error' in result &&
      typeof result.error === 'string' && /^[a-z][a-z0-9_]{0,63}$/.test(result.error)
      ? `: ${result.error}`
      : ''
    throw new StitchCheckoutError(
      'STITCH_TOKEN_REQUEST_FAILED',
      `Stitch authentication failed (HTTP ${response.status}${oauthError}). Check the Live client credentials and payment-request permissions.`,
    )
  }
  return result.access_token
}

function getRedirectUrl() {
  const baseUrl = process.env.APP_BASE_URL
  if (!baseUrl) {
    throw new StitchCheckoutError('APP_BASE_URL_MISSING', 'APP_BASE_URL is missing from the staging server settings.')
  }
  let redirectUrl: URL
  try {
    redirectUrl = new URL('/checkout/payment-result', baseUrl)
  } catch {
    throw new StitchCheckoutError('APP_BASE_URL_INVALID', 'APP_BASE_URL is invalid. Set it to the full staging website URL.')
  }
  if (process.env.STITCH_ENV === 'live' && redirectUrl.protocol !== 'https:') {
    throw new StitchCheckoutError('STITCH_RETURN_URL_INSECURE', 'Live Stitch checkout requires an HTTPS APP_BASE_URL.')
  }
  return redirectUrl
}

export async function createStitchPaymentRequest(order: {
  orderNumber: string
  total: number
  email: string
  customerId: string | null
}, externalReference: string): Promise<StitchPaymentRequest> {
  const redirectUrl = getRedirectUrl()
  const token = await getClientToken()
  const mutation = `
    mutation CreatePaymentRequest($input: ClientPaymentInitiationRequestInput!) {
      clientPaymentInitiationRequestCreate(input: $input) {
        paymentInitiationRequest {
          id
          url
        }
      }
    }
  `
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        input: {
          amount: { quantity: order.total.toFixed(2), currency: 'ZAR' },
          externalReference,
          payerInformation: { payerId: order.customerId || order.email },
          metadata: { orderNumber: order.orderNumber },
          expireAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        },
      },
    }),
    signal: AbortSignal.timeout(15000),
  })
  let result: unknown
  try {
    result = await response.json()
  } catch {
    throw new StitchCheckoutError('STITCH_PAYMENT_RESPONSE_INVALID', 'Stitch returned an unreadable payment-request response.')
  }
  if (!response.ok || !isRecord(result)) {
    throw new StitchCheckoutError('STITCH_PAYMENT_REQUEST_FAILED', `Stitch could not create the payment request (HTTP ${response.status}).`)
  }

  const errors = Array.isArray(result.errors) ? result.errors : []
  const data = isRecord(result.data) ? result.data : null
  const create = data && isRecord(data.clientPaymentInitiationRequestCreate)
    ? data.clientPaymentInitiationRequestCreate
    : null
  const payment = create && isRecord(create.paymentInitiationRequest)
    ? create.paymentInitiationRequest
    : null
  if (errors.length || !payment || typeof payment.id !== 'string' || typeof payment.url !== 'string') {
    throw new StitchCheckoutError(
      errors.length ? 'STITCH_PAYMENT_REQUEST_REJECTED' : 'STITCH_PAYMENT_RESPONSE_INVALID',
      errors.length
        ? 'Stitch rejected the payment request. Check the Live client permissions and payment request settings.'
        : 'Stitch returned a response without a valid payment URL.',
    )
  }

  let paymentUrl: URL
  try {
    paymentUrl = new URL(payment.url)
  } catch {
    throw new StitchCheckoutError('STITCH_PAYMENT_URL_INVALID', 'Stitch returned an invalid payment URL.')
  }
  if (
    paymentUrl.protocol !== 'https:' ||
    !['secure.stitch.money', 'secure-local.stitchmoney.com'].includes(paymentUrl.hostname)
  ) {
    throw new StitchCheckoutError('STITCH_PAYMENT_URL_INVALID', 'Stitch returned an unexpected payment URL.')
  }
  paymentUrl.searchParams.set('redirect_uri', redirectUrl.toString())

  return { id: payment.id, url: paymentUrl.toString() }
}

export async function startStitchCheckout(orderId: string, email: string) {
  if (!isStitchConfigured()) {
    return { error: 'Stitch Express is not configured yet. Please choose EFT or contact Sunder Computers.' as const }
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, paymentMethod: { in: ['stitch', 'stitchPayLater'] } },
    select: { id: true, orderNumber: true, total: true, email: true, customerId: true, paymentStatus: true },
  })
  if (!order || order.email.toLowerCase() !== email.toLowerCase()) {
    return { error: 'Order could not be verified.' as const }
  }
  if (order.paymentStatus === 'paid') {
    return { error: 'This order has already been paid.' as const }
  }

  const existing = await prisma.paymentTransaction.findFirst({
    where: { orderId: order.id, provider: 'stitch', status: { in: ['pending', 'initiating'] } },
    orderBy: { createdAt: 'desc' },
  })
  if (existing?.status === 'pending' && existing.checkoutUrl && Date.now() - existing.updatedAt.getTime() < 17 * 60 * 1000) {
    return { paymentUrl: existing.checkoutUrl, orderNumber: order.orderNumber }
  }
  if (existing?.status === 'initiating' && Date.now() - existing.updatedAt.getTime() < 90 * 1000) {
    return { error: 'Stitch checkout is already being started. Please wait a moment and retry.' as const }
  }

  const transaction = await prisma.paymentTransaction.create({
    data: { orderId: order.id, provider: 'stitch', status: 'initiating' },
  })
  const externalReference = `${order.orderNumber}:${transaction.id}`
  await prisma.paymentTransaction.update({
    where: { id: transaction.id },
    data: { externalRef: externalReference },
  })
  await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: 'pending' },
  })

  try {
    const payment = await createStitchPaymentRequest(order, externalReference)
    const updated = await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { status: 'pending', externalId: payment.id, checkoutUrl: payment.url },
    })
    return { paymentUrl: updated.checkoutUrl!, orderNumber: order.orderNumber }
  } catch (error) {
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { status: 'failed', checkoutUrl: null },
    })
    throw error
  }
}
