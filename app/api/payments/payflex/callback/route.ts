import { NextResponse } from 'next/server'
import { reconcilePayflexOrder } from '@/lib/payflex'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid Payflex callback.' }, { status: 400 })
  }

  const orderId = typeof body.orderId === 'string' ? body.orderId : ''
  if (!orderId) return NextResponse.json({ error: 'Payflex order ID is required.' }, { status: 400 })

  try {
    const result = await reconcilePayflexOrder(orderId)
    return NextResponse.json({ received: true, paymentStatus: result.status })
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PAYFLEX_CALLBACK_FAILED'
    console.error('[Payflex callback could not be reconciled]', code)
    return NextResponse.json({ error: 'Payflex callback could not be verified yet.' }, { status: 503 })
  }
}
