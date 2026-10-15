import { prisma } from '@/lib/prisma'

const REQUEST_TIMEOUT_MS = 15000
const SANDBOX_API_URL = 'https://api.uat.payflex.co.za'
const LIVE_API_URL = 'https://api.payflex.co.za'

type PayflexOrderItem = {
  stockNumber: string
  name: string
  quantity: number
  unitPrice: number
}

type PayflexCheckoutOrder = {
  id: string
  orderNumber: string
  total: number
  tax: number
  shipping: number
  email: string
  phone: string | null
  firstName: string | null
  lastName: string | null
  billingAddress: string | null
  billingSuburb: string | null
  billingCity: string | null
  billingProvince: string | null
  billingPostalCode: string | null
  shippingAddress: string | null
  shippingSuburb: string | null
  shippingCity: string | null
  shippingProvince: string | null
  shippingPostalCode: string | null
  items: PayflexOrderItem[]
}

type TokenResponse = { access_token?: unknown; expires_in?: unknown }
type PayflexApiOrder = {
  orderId?: unknown
  redirectUrl?: unknown
  orderStatus?: unknown
  amount?: unknown
  merchantReference?: unknown
}

let cachedToken: { value: string; expiresAt: number } | null = null

function environment() {
  return process.env.PAYFLEX_ENV?.trim().toLowerCase() === 'live' ? 'live' : 'sandbox'
}

function credentials() {
  const clientId = process.env.PAYFLEX_CLIENT_ID?.trim()
  const clientSecret = process.env.PAYFLEX_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) throw new Error('PAYFLEX_CREDENTIALS_MISSING')
  return { clientId, clientSecret }
}

export function isPayflexConfigured() {
  return Boolean(process.env.PAYFLEX_CLIENT_ID?.trim() && process.env.PAYFLEX_CLIENT_SECRET?.trim())
}

function apiBaseUrl() {
  return environment() === 'live' ? LIVE_API_URL : SANDBOX_API_URL
}

function authConfiguration() {
  const sandbox = environment() !== 'live'
  return {
    url: process.env.PAYFLEX_AUTH_URL?.trim() || (sandbox
      ? 'https://auth-uat.payflex.co.za/auth/merchant'
      : 'https://auth.payflex.co.za/auth/merchant'),
    audience: process.env.PAYFLEX_AUDIENCE?.trim() || (sandbox
      ? 'https://auth-dev.payflex.co.za'
      : 'https://auth-production.payflex.co.za'),
  }
}

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30000) return cachedToken.value
  const { clientId, clientSecret } = credentials()
  const auth = authConfiguration()

  let response: Response
  try {
    response = await fetch(auth.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        audience: auth.audience,
        grant_type: 'client_credentials',
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    throw new Error('PAYFLEX_AUTH_CONNECTION_FAILED')
  }

  let payload: TokenResponse
  try {
    payload = await response.json() as TokenResponse
  } catch {
    throw new Error('PAYFLEX_AUTH_RESPONSE_INVALID')
  }
  if (!response.ok || typeof payload.access_token !== 'string' || !payload.access_token) {
    console.error('[Payflex auth failed]', { status: response.status })
    throw new Error('PAYFLEX_AUTH_FAILED')
  }

  const expiresIn = Number(payload.expires_in) || 300
  cachedToken = { value: payload.access_token, expiresAt: Date.now() + expiresIn * 1000 }
  return cachedToken.value
}

async function apiRequest(path: string, method: 'GET' | 'POST', body?: Record<string, unknown>) {
  const token = await accessToken()
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    throw new Error('PAYFLEX_API_CONNECTION_FAILED')
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error('PAYFLEX_API_RESPONSE_INVALID')
  }
  if (!response.ok || typeof payload !== 'object' || payload === null) {
    console.error('[Payflex API request failed]', { path, status: response.status })
    throw new Error(`PAYFLEX_API_FAILED:${response.status}`)
  }
  return payload as Record<string, unknown>
}

function appUrl(path: string) {
  const base = process.env.APP_BASE_URL?.trim()
  if (!base) throw new Error('PAYFLEX_APP_BASE_URL_MISSING')
  let url: URL
  try {
    url = new URL(base)
  } catch {
    throw new Error('PAYFLEX_APP_BASE_URL_INVALID')
  }
  if (url.protocol !== 'https:') throw new Error('PAYFLEX_HTTPS_REQUIRED')
  return new URL(path, url.origin).toString()
}

function address(line1: string | null, suburb: string | null, city: string | null, province: string | null, postalCode: string | null) {
  return {
    addressLine1: line1 || '',
    addressLine2: '',
    suburb: suburb || '',
    city: city || '',
    postcode: postalCode || '',
    state: province || '',
  }
}

export async function createPayflexOrder(order: PayflexCheckoutOrder, merchantReference: string) {
  const payload = await apiRequest('/order', 'POST', {
    amount: Number(order.total.toFixed(2)),
    consumer: {
      phoneNumber: order.phone || '',
      givenNames: order.firstName || '',
      surname: order.lastName || '',
      email: order.email,
    },
    billing: address(order.billingAddress, order.billingSuburb, order.billingCity, order.billingProvince, order.billingPostalCode),
    shipping: address(order.shippingAddress, order.shippingSuburb, order.shippingCity, order.shippingProvince, order.shippingPostalCode),
    description: `Sunder Computers order ${order.orderNumber}`,
    items: order.items.map((item) => ({
      description: item.name,
      name: item.name,
      sku: item.stockNumber,
      quantity: item.quantity,
      price: Number(item.unitPrice.toFixed(2)),
    })),
    merchant: {
      redirectConfirmUrl: appUrl('/checkout/payment-result?provider=payflex'),
      redirectCancelUrl: appUrl('/checkout/payment-result?provider=payflex'),
      statusCallbackUrl: appUrl('/api/payments/payflex/callback'),
    },
    merchantReference,
    taxAmount: Number(order.tax.toFixed(2)),
    shippingAmount: Number(order.shipping.toFixed(2)),
  })

  const orderId = typeof payload.orderId === 'string' ? payload.orderId : ''
  const redirectUrl = typeof payload.redirectUrl === 'string' ? payload.redirectUrl : ''
  if (!orderId || !redirectUrl) throw new Error('PAYFLEX_CHECKOUT_RESPONSE_INVALID')
  let checkoutUrl: URL
  try {
    checkoutUrl = new URL(redirectUrl)
  } catch {
    throw new Error('PAYFLEX_CHECKOUT_URL_INVALID')
  }
  const allowedHosts = environment() === 'live'
    ? ['checkout.payflex.co.za']
    : ['checkout.uat.payflex.co.za', 'checkout.payflex.co.za']
  if (checkoutUrl.protocol !== 'https:' || !allowedHosts.includes(checkoutUrl.hostname)) {
    throw new Error('PAYFLEX_CHECKOUT_URL_INVALID')
  }
  return { orderId, redirectUrl: checkoutUrl.toString() }
}

export async function fetchPayflexOrder(payflexOrderId: string) {
  const payload = await apiRequest(`/order/${encodeURIComponent(payflexOrderId)}`, 'GET')
  const inner = typeof payload.data === 'object' && payload.data !== null
    ? payload.data as Record<string, unknown>
    : payload
  return inner as PayflexApiOrder
}

export async function reconcilePayflexOrder(payflexOrderId: string) {
  const transaction = await prisma.paymentTransaction.findFirst({
    where: { provider: 'payflex', externalId: payflexOrderId },
    include: { order: { include: { items: { select: { productId: true, quantity: true } } } } },
  })
  if (!transaction) throw new Error('PAYFLEX_TRANSACTION_NOT_FOUND')

  const remote = await fetchPayflexOrder(payflexOrderId)
  if (remote.merchantReference !== transaction.externalRef) throw new Error('PAYFLEX_REFERENCE_MISMATCH')
  const amount = Number(remote.amount)
  if (!Number.isFinite(amount) || Math.abs(amount - transaction.order.total) > 0.01) {
    throw new Error('PAYFLEX_AMOUNT_MISMATCH')
  }

  const status = typeof remote.orderStatus === 'string' ? remote.orderStatus.toLowerCase() : ''
  const terminalFailure = ['declined', 'abandoned', 'cancelled', 'canceled'].includes(status)
  const paid = status === 'approved'

  if (paid) {
    await prisma.$transaction(async (db) => {
      const changed = await db.paymentTransaction.updateMany({
        where: { id: transaction.id, status: { in: ['pending', 'initiating'] } },
        data: { status: 'paid' },
      })
      if (changed.count === 1) {
        await db.order.update({ where: { id: transaction.orderId }, data: { paymentStatus: 'paid', status: 'processing' } })
      }
    })
  } else if (terminalFailure) {
    await prisma.$transaction(async (db) => {
      const changed = await db.paymentTransaction.updateMany({
        where: { id: transaction.id, status: { in: ['pending', 'initiating'] } },
        data: { status },
      })
      if (changed.count !== 1) return
      await db.order.update({ where: { id: transaction.orderId }, data: { paymentStatus: status, status: 'cancelled' } })
      for (const item of transaction.order.items) {
        if (!item.productId) continue
        await db.product.update({ where: { id: item.productId }, data: { quantity: { increment: item.quantity } } })
        const product = await db.product.findUnique({ where: { id: item.productId }, select: { status: true } })
        if (product?.status === 'sold') {
          await db.product.update({
            where: { id: item.productId },
            data: { status: 'active', soldAt: null, websiteActive: true },
          })
        }
      }
    })
  }

  const current = await prisma.order.findUnique({ where: { id: transaction.orderId }, select: { orderNumber: true, paymentStatus: true } })
  return {
    paid: current?.paymentStatus === 'paid',
    orderNumber: current?.orderNumber || null,
    status: current?.paymentStatus || status || 'pending',
    verified: true,
  }
}
