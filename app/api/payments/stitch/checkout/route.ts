import { NextResponse } from 'next/server'
import { startStitchCheckout, StitchCheckoutError } from '@/lib/stitch-payments'

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid checkout request.' }, { status: 400 })
    }
    const input = body as Record<string, unknown>
    if (
      typeof input.orderId !== 'string' || input.orderId.length > 128 ||
      typeof input.email !== 'string' || input.email.length > 254
    ) {
      return NextResponse.json({ error: 'Order and email are required.' }, { status: 400 })
    }

    const result = await startStitchCheckout(input.orderId, input.email.trim().toLowerCase())
    if (typeof result.error === 'string') {
      const status = result.error === 'Order could not be verified.' ? 404 :
        result.error === 'This order has already been paid.' ? 409 :
          result.error.startsWith('Stitch checkout is already') ? 409 : 503
      return NextResponse.json({ error: result.error }, { status })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('Start Stitch checkout error:', error)
    if (error instanceof StitchCheckoutError) {
      return NextResponse.json(
        { error: `${error.message} (Code: ${error.code})`, diagnosticCode: error.code },
        { status: 502 },
      )
    }
    return NextResponse.json({
      error: 'Unable to start Stitch checkout. Please contact Sunder Computers with diagnostic code STITCH_CHECKOUT_INTERNAL_ERROR.',
      diagnosticCode: 'STITCH_CHECKOUT_INTERNAL_ERROR',
    }, { status: 502 })
  }
}
