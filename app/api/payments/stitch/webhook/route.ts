import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { markStitchPaymentFromExpress } from '@/lib/stitch-payments'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

function verifyExpressSignature(rawBody: string, signature: string | null) {
  const clientSecret = process.env.STITCH_CLIENT_SECRET
  if (!clientSecret || !signature) return false

  // Mirrors the signature calculation in the supplied Stitch Express WooCommerce plugin:
  // base64(SHA256(clientSecret)) is the HMAC-SHA256 key, raw request body is the message.
  const key = Buffer.from(createHash('sha256').update(clientSecret).digest().toString('base64'), 'utf8')
  const expected = createHmac('sha256', key).update(rawBody).digest('hex')
  const supplied = Buffer.from(signature.trim(), 'utf8')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  return supplied.length === expectedBuffer.length && timingSafeEqual(supplied, expectedBuffer)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  if (rawBody.length > 1_000_000) {
    return NextResponse.json({ error: 'Payload too large.' }, { status: 413 })
  }

  if (!verifyExpressSignature(rawBody, request.headers.get('x-stitch-express-signature'))) {
    return NextResponse.json({ error: 'Invalid Stitch Express signature.' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  if (!isRecord(payload) || typeof payload.payment_id !== 'string' || typeof payload.reference !== 'string') {
    return NextResponse.json({ error: 'Invalid Stitch Express event.' }, { status: 400 })
  }

  const transaction = await prisma.paymentTransaction.findFirst({
    where: { provider: 'stitch', externalRef: payload.reference },
    select: { id: true },
  })
  if (!transaction) return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 })

  try {
    // Do not trust the webhook payload as proof of payment; query Stitch's API.
    await markStitchPaymentFromExpress(payload.payment_id, payload.reference)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stitch Express webhook verification failed:', error)
    return NextResponse.json({ error: 'Could not verify Stitch Express payment.' }, { status: 502 })
  }
}
