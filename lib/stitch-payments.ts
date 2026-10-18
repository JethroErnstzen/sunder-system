import { prisma } from '@/lib/prisma'
import { sendOrderEmails } from '@/lib/order-emails'

const EXPRESS_BASE_URL = 'https://express.stitch.money'
const REQUEST_TIMEOUT_MS = 15000

type StitchPaymentLink = { id: string; url: string }

export class StitchCheckoutError extends Error {
  constructor(readonly code: string, message: string) {
    super(message)
    this.name = 'StitchCheckoutError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function credentials() {
  const clientId = process.env.STITCH_CLIENT_ID?.trim()
  const clientSecret = process.env.STITCH_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) {
    throw new StitchCheckoutError('STITCH_CREDENTIALS_MISSING', 'Stitch Express credentials are missing.')
  }
  return { clientId, clientSecret }
}

export function isStitchConfigured() {
  return process.env.STITCH_ENABLED === 'true'
    && Boolean(process.env.STITCH_CLIENT_ID?.trim())
    && Boolean(process.env.STITCH_CLIENT_SECRET?.trim())
    && Boolean(process.env.APP_BASE_URL?.trim())
    && (process.env.STITCH_ENV === 'test' || process.env.STITCH_ENV === 'live')
}

async function requestExpress(path: string, method: 'GET' | 'POST', body?: Record<string, unknown>) {
  const { clientId, clientSecret } = credentials()

  let tokenResponse: Response
  try {
    tokenResponse = await fetch(`${EXPRESS_BASE_URL}/api/v1/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-IS-WC': 'true',
        'X-Stitch-Express-WC-Plugin-Version': '1.9.5',
      },
      body: JSON.stringify({ clientId, clientSecret }),
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    throw new StitchCheckoutError('STITCH_TOKEN_CONNECTION_FAILED', 'Could not connect to Stitch Express authentication.')
  }

  let tokenPayload: unknown
  try {
    tokenPayload = await tokenResponse.json()
  } catch {
    throw new StitchCheckoutError('STITCH_TOKEN_RESPONSE_INVALID', 'Stitch Express returned an invalid token response.')
  }

  const tokenData = isRecord(tokenPayload) && isRecord(tokenPayload.data) ? tokenPayload.data : null
  const accessToken = tokenData && typeof tokenData.accessToken === 'string' ? tokenData.accessToken : null
  if (!tokenResponse.ok || !accessToken) {
    throw new StitchCheckoutError('STITCH_TOKEN_REQUEST_FAILED', `Stitch Express authentication failed (HTTP ${tokenResponse.status}).`)
  }

  let response: Response
  try {
    response = await fetch(`${EXPRESS_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-IS-WC': 'true',
        'X-Stitch-Express-WC-Plugin-Version': '1.9.5',
      },
      ...(method === 'POST' ? { body: JSON.stringify(body ?? {}) } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    throw new StitchCheckoutError('STITCH_API_CONNECTION_FAILED', 'Could not connect to Stitch Express.')
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new StitchCheckoutError('STITCH_API_RESPONSE_INVALID', 'Stitch Express returned an invalid API response.')
  }
 
if (!response.ok || !isRecord(payload) || payload.success === false) {
  const details = isRecord(payload)
    ? {
        message: payload.message,
        error: payload.error,
        error_description: payload.error_description,
        code: payload.code,
        errors: payload.errors,
      }
    : { response: 'Non-JSON response' }

  console.error('[Stitch Express API error]', {
    endpoint: path,
    status: response.status,
    details,
  })

  throw new StitchCheckoutError(
    'STITCH_API_REQUEST_FAILED',
`Stitch Express rejected the request (HTTP ${response.status}): ${JSON.stringify(payload)}`,
  )
}

  return payload
}

function getAppOrigin() {
  const raw = process.env.APP_BASE_URL?.trim()
  if (!raw) throw new StitchCheckoutError('APP_BASE_URL_MISSING', 'APP_BASE_URL is missing.')
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new StitchCheckoutError('APP_BASE_URL_INVALID', 'APP_BASE_URL must be a full URL.')
  }
  if (process.env.STITCH_ENV === 'live' && url.protocol !== 'https:') {
    throw new StitchCheckoutError('STITCH_RETURN_URL_INSECURE', 'Live checkout requires an HTTPS APP_BASE_URL.')
  }
  return url.origin
}

export async function createStitchPaymentRequest(
  order: { orderNumber: string; total: number; email: string; customerId: string | null },
  externalReference: string,
): Promise<StitchPaymentLink> {
  const amount = Math.round(Number(order.total) * 100)
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new StitchCheckoutError('STITCH_AMOUNT_INVALID', 'The order amount is invalid.')
  }

  // Stitch only accepts return URLs registered in the merchant settings.
  // INTEGRATIONS-SETUP.md registers /checkout/payment-result, so use that
  // same URL here instead of the internal callback API route.
  const callbackUrl = new URL('/checkout/payment-result', getAppOrigin()).toString()
  const response = await requestExpress('/api/v1/payments', 'POST', {
    amount,
    payerName: order.email.slice(0, 80),
    payerPhoneNumber: null,
    payerEmailAddress: order.email,
    merchantReference: externalReference,
    skipCheckoutPage: true,
    currency: 'ZAR',
  })

  console.error(
  '[Stitch Express payment creation response]',
  JSON.stringify(response),
)

  const data = isRecord(response.data) ? response.data : null
  const payment = data && isRecord(data.payment) ? data.payment : null
  const rawLink = payment && typeof payment.link === 'string' ? payment.link : null
  const rawId = payment && (
    typeof payment.id === 'string' ? payment.id :
    typeof payment.paymentId === 'string' ? payment.paymentId : null
  )

  if (!rawLink) {
    throw new StitchCheckoutError('STITCH_PAYMENT_URL_MISSING', 'Stitch Express did not return a checkout link.')
  }

  let link: URL
  try {
    link = new URL(rawLink)
  } catch {
    throw new StitchCheckoutError('STITCH_PAYMENT_URL_INVALID', 'Stitch Express returned an invalid checkout link.')
  }
  if (link.protocol !== 'https:' || !['express.stitch.money', 'secure.stitch.money'].includes(link.hostname)) {
    throw new StitchCheckoutError('STITCH_PAYMENT_URL_INVALID', 'Stitch Express returned an unexpected checkout URL.')
  }

  // The existing WooCommerce plugin passes its return target as redirect_url.
  link.searchParams.set('redirect_url', callbackUrl)
  return { id: rawId || externalReference, url: link.toString() }
}

export async function verifyStitchExpressPayment(paymentId: string, reference: string) {
  const query = new URLSearchParams({ merchantReference: reference })
  const response = await requestExpress(
    `/api/v1/payments/${encodeURIComponent(paymentId)}?${query.toString()}`,
    'GET',
  )
  const data = isRecord(response.data) ? response.data : null
  const payment = data && isRecord(data.payment) ? data.payment : null
  const status = payment && typeof payment.status === 'string' ? payment.status.toUpperCase() : null
  const amount = payment && (typeof payment.amount === 'number' || typeof payment.amount === 'string')
    ? Number(payment.amount)
    : null
  const currency = payment && typeof payment.currency === 'string' ? payment.currency.toUpperCase() : null
  return { status, amount, currency }
}

export async function markStitchPaymentFromExpress(paymentId: string, reference: string) {
  const transaction = await prisma.paymentTransaction.findFirst({
    where: { provider: 'stitch', externalRef: reference },
    include: {
      order: {
        select: { id: true, orderNumber: true, total: true, paymentStatus: true },
      },
    },
  })
  if (!transaction) {
    throw new StitchCheckoutError('STITCH_TRANSACTION_NOT_FOUND', 'No matching Stitch transaction was found.')
  }

  const verified = await verifyStitchExpressPayment(paymentId, reference)
  const terminalFailure = ['CANCELLED', 'EXPIRED', 'FAILED'].includes(verified.status ?? '')

  if (verified.status !== 'PAID' && verified.status !== 'SETTLED') {
    if (terminalFailure) {
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: verified.status!.toLowerCase(), externalId: paymentId },
      })
      if (transaction.order.paymentStatus !== 'paid') {
        await prisma.order.update({
          where: { id: transaction.order.id },
          data: { paymentStatus: verified.status!.toLowerCase() },
        })
      }
    }
    return { paid: false, orderId: transaction.order.id, orderNumber: transaction.order.orderNumber }
  }

  const expectedCents = Math.round(Number(transaction.order.total) * 100)
  if (verified.currency && verified.currency !== 'ZAR') {
    throw new StitchCheckoutError('STITCH_CURRENCY_MISMATCH', 'The verified Stitch payment currency is not ZAR.')
  }
  // The API version used by the plugin may omit amount/currency. If amount is
  // returned, accept cents or rands, but reject a mismatch.
  if (verified.amount !== null && verified.amount !== expectedCents && verified.amount !== Number(transaction.order.total)) {
    throw new StitchCheckoutError('STITCH_AMOUNT_MISMATCH', 'The verified payment amount does not match the order.')
  }

  let firstPaidTransition = false
  await prisma.$transaction(async (db) => {
    const changed = await db.paymentTransaction.updateMany({
      where: { id: transaction.id, status: { in: ['pending', 'initiating'] } },
      data: { status: 'paid', externalId: paymentId },
    })
    if (changed.count !== 1) return

    const orderChanged = await db.order.updateMany({
      where: { id: transaction.order.id, paymentStatus: { not: 'paid' } },
      data: { paymentStatus: 'paid', status: 'processing' },
    })
    firstPaidTransition = orderChanged.count === 1
  })

  if (firstPaidTransition) {
    const paidOrder = await prisma.order.findUnique({
      where: { id: transaction.order.id },
      include: { items: { orderBy: { id: 'asc' } } },
    })
    if (paidOrder) {
      try {
        const emailResult = await sendOrderEmails(paidOrder)
        if (!emailResult.customerEmailSent || !emailResult.adminEmailSent) {
          console.error('[Stitch paid order email delivery incomplete]', {
            orderNumber: paidOrder.orderNumber,
            customerEmailSent: emailResult.customerEmailSent,
            adminEmailSent: emailResult.adminEmailSent,
            emailErrors: emailResult.emailErrors,
          })
        }
      } catch (error) {
        console.error('[Stitch paid order email delivery failed]', {
          orderNumber: paidOrder.orderNumber,
          error: error instanceof Error ? error.message : error,
        })
      }
    }
  }
  return { paid: true, orderId: transaction.order.id, orderNumber: transaction.order.orderNumber }
}

export async function startStitchCheckout(orderId: string, email: string) {
  if (!isStitchConfigured()) {
    return { error: 'Stitch Express is not configured. Please choose another payment method or contact Sunder Computers.' as const }
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, paymentMethod: { in: ['stitch', 'stitchPayLater'] } },
    select: { id: true, orderNumber: true, total: true, email: true, customerId: true, paymentStatus: true },
  })
  if (!order || order.email.toLowerCase() !== email.toLowerCase()) {
    return { error: 'Order could not be verified.' as const }
  }
  if (order.paymentStatus === 'paid') return { error: 'This order has already been paid.' as const }

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
  const externalReference = `${order.orderNumber}-${transaction.id}`

  try {
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { externalRef: externalReference },
    })
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'pending' } })

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
