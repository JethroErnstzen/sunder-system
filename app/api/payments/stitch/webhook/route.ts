import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function verifySvixSignature(request: Request, rawBody: string) {
  const secret = process.env.STITCH_WEBHOOK_SECRET
  const secretMatch = secret?.match(/^whsec_([A-Za-z0-9+/]+={0,2})$/)
  const messageId = request.headers.get('svix-id')
  const timestamp = request.headers.get('svix-timestamp')
  const signatures = request.headers.get('svix-signature')
  if (!secretMatch || !messageId || !timestamp || !signatures || !/^\d+$/.test(timestamp)) return false
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 5 * 60) return false

  const key = Buffer.from(secretMatch[1], 'base64')
  if (!key.length) return false
  const signedContent = `${messageId}.${timestamp}.${rawBody}`
  const expected = createHmac('sha256', key).update(signedContent).digest()
  return signatures.split(' ').some((signature) => {
    const [version, value] = signature.split(',', 2)
    if (version !== 'v1' || !value) return false
    const supplied = Buffer.from(value, 'base64')
    return supplied.length === expected.length && timingSafeEqual(supplied, expected)
  })
}

function amountInCents(value: unknown) {
  const amount = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null
}

function validAmount(value: unknown) {
  const amount = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN
  return Number.isFinite(amount) && amount >= 0 ? amount : null
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  if (rawBody.length > 1_000_000) {
    return NextResponse.json({ error: 'Webhook payload is too large.' }, { status: 413 })
  }
  if (!verifySvixSignature(request, rawBody)) {
    return NextResponse.json({ error: 'Invalid Stitch webhook signature.' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid webhook payload.' }, { status: 400 })
  }

  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : null
  const client = data && isRecord(data.client) ? data.client : null
  const requests = client && isRecord(client.paymentInitiationRequests) ? client.paymentInitiationRequests : null
  const node = requests && isRecord(requests.node) ? requests.node : null
  const state = node && isRecord(node.state) ? node.state : null
  const nodeAmount = node && isRecord(node.amount) ? node.amount : null

  let stitchIds: string[]
  let eventAmountInCents: number | null = null
  let flatAmount: number | null = null
  let currency: string | null
  let paymentStatus: 'paid' | 'cancelled' | 'expired' | null

  if (node && state && node.__typename === 'PaymentInitiationRequest') {
    if (
      typeof node.externalReference !== 'string' ||
      typeof node.id !== 'string' ||
      typeof node.currency !== 'string' ||
      !nodeAmount ||
      typeof nodeAmount.currency !== 'string'
    ) {
      return NextResponse.json({ error: 'Invalid Stitch payment event.' }, { status: 400 })
    }
    stitchIds = [node.id, node.externalReference]
    eventAmountInCents = amountInCents(nodeAmount.quantity)
    currency = node.currency === nodeAmount.currency ? node.currency : null
    paymentStatus = state.__typename === 'PaymentInitiationRequestCompleted' ? 'paid' :
      state.__typename === 'PaymentInitiationRequestCancelled' ? 'cancelled' :
        state.__typename === 'PaymentInitiationRequestExpired' ? 'expired' : null
  } else if (isRecord(payload)) {
    const status = typeof payload.status === 'string' ? payload.status.toUpperCase() : ''
    flatAmount = validAmount(payload.amount)
    if (
      typeof payload.id !== 'string' ||
      !payload.id ||
      (payload.linkId !== undefined && payload.linkId !== null && typeof payload.linkId !== 'string') ||
      flatAmount === null ||
      (status !== 'PAID' && status !== 'SETTLED')
    ) {
      return NextResponse.json({ error: 'Invalid Stitch payment event.' }, { status: 400 })
    }
    stitchIds = [payload.id, ...(typeof payload.linkId === 'string' && payload.linkId ? [payload.linkId] : [])]
    currency = typeof payload.currency === 'string' ? payload.currency : 'ZAR'
    paymentStatus = 'paid'
  } else {
    return NextResponse.json({ error: 'Invalid Stitch payment event.' }, { status: 400 })
  }

  if (!paymentStatus) return NextResponse.json({ received: true })

  const transaction = await prisma.paymentTransaction.findFirst({
    where: {
      provider: 'stitch',
      OR: [
        { externalId: { in: stitchIds } },
        { externalRef: { in: stitchIds } },
      ],
    },
    include: {
      order: { select: { id: true, total: true, paymentStatus: true } },
    },
  })
  if (!transaction) return NextResponse.json({ error: 'Stitch payment transaction not found.' }, { status: 404 })

  const orderAmount = amountInCents(transaction.order.total)
  const amountMatchesOrder = eventAmountInCents !== null
    ? orderAmount === eventAmountInCents
    : flatAmount !== null && (
        Math.round(transaction.order.total * 100) === Math.round(flatAmount * 100) ||
        (Number.isSafeInteger(flatAmount) && orderAmount === flatAmount)
      )
  if (
    currency !== 'ZAR' ||
    orderAmount === null ||
    !amountMatchesOrder
  ) {
    console.error('Stitch webhook amount/currency mismatch for order:', transaction.order.id)
    return NextResponse.json({ error: 'Payment details do not match the order.' }, { status: 400 })
  }

  const stitchRequestId = stitchIds.find((id) => id === transaction.externalId) || stitchIds[0]
  if (paymentStatus === 'paid' && transaction.order.paymentStatus === 'paid' && transaction.status !== 'paid') {
    console.error('Multiple Stitch payment attempts completed for order:', transaction.order.id)
  }
  await prisma.$transaction(async (db) => {
    await db.paymentTransaction.update({
      where: { id: transaction.id },
      data: { status: paymentStatus, externalId: stitchRequestId },
    })
    if (paymentStatus === 'paid') {
      await db.order.update({
        where: { id: transaction.order.id },
        data: { paymentStatus: 'paid', status: 'processing' },
      })
      return
    }

    if (transaction.order.paymentStatus !== 'paid') {
      const newerAttempt = await db.paymentTransaction.findFirst({
        where: {
          orderId: transaction.order.id,
          provider: 'stitch',
          id: { not: transaction.id },
          createdAt: { gt: transaction.createdAt },
          status: { in: ['pending', 'initiating'] },
        },
        select: { id: true },
      })
      if (!newerAttempt) {
        await db.order.update({
          where: { id: transaction.order.id },
          data: { paymentStatus },
        })
      }
    }
  })

  return NextResponse.json({ received: true })
}
