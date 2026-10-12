import { prisma } from '@/lib/prisma'

const TOKEN_URL = 'https://secure.stitch.money/connect/token'
const GRAPHQL_URL = 'https://api.stitch.money/graphql'

type StitchPaymentRequest = {
  id: string
  url: string
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
  const clientId = process.env.STITCH_CLIENT_ID
  const clientSecret = process.env.STITCH_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Stitch client credentials are missing.')
  const form = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'client_paymentrequest',
    audience: TOKEN_URL,
  })
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
    signal: AbortSignal.timeout(15000),
  })
  const result: unknown = await response.json()
  if (!response.ok || !isRecord(result) || typeof result.access_token !== 'string') {
    throw new Error(`Stitch client token request failed (${response.status}).`)
  }
  return result.access_token
}

export async function createStitchPaymentRequest(order: {
  orderNumber: string
  total: number
  email: string
  customerId: string | null
}, externalReference: string): Promise<StitchPaymentRequest> {
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
  const result: unknown = await response.json()
  if (!response.ok || !isRecord(result)) {
    throw new Error(`Stitch payment request failed (${response.status}).`)
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
    const messages = errors.map((error) => isRecord(error) && typeof error.message === 'string' ? error.message : 'GraphQL error')
    throw new Error(messages.join('; ') || 'Stitch did not return a payment request.')
  }

  const paymentUrl = new URL(payment.url)
  if (
    paymentUrl.protocol !== 'https:' ||
    !['secure.stitch.money', 'secure-local.stitchmoney.com'].includes(paymentUrl.hostname)
  ) {
    throw new Error('Stitch returned an unexpected payment URL.')
  }
  const baseUrl = process.env.APP_BASE_URL
  if (!baseUrl) throw new Error('APP_BASE_URL must be configured for Stitch checkout.')
  const redirectUrl = new URL('/checkout/payment-result', baseUrl)
  if (process.env.STITCH_ENV === 'live' && redirectUrl.protocol !== 'https:') {
    throw new Error('Live Stitch checkout requires an HTTPS APP_BASE_URL.')
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
