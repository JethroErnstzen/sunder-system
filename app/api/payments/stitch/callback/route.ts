import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const paymentId = url.searchParams.get('payment_id')
  const reference = url.searchParams.get('reference')
  const origin = process.env.APP_BASE_URL || url.origin
  const resultUrl = new URL('/checkout/payment-result', origin)

  if (!paymentId || !reference) {
    resultUrl.searchParams.set('status', 'pending')
    resultUrl.searchParams.set('message', 'Payment details could not be verified. Please contact Sunder Computers before trying again.')
    return NextResponse.redirect(resultUrl)
  }

  // The result page verifies Stitch's response before displaying any status.
  resultUrl.searchParams.set('payment_id', paymentId)
  resultUrl.searchParams.set('reference', reference)
  return NextResponse.redirect(resultUrl)
}
