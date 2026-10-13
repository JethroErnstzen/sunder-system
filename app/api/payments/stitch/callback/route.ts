import { NextResponse } from 'next/server'
import { markStitchPaymentFromExpress, StitchCheckoutError } from '@/lib/stitch-payments'

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

  try {
    const result = await markStitchPaymentFromExpress(paymentId, reference)
    resultUrl.searchParams.set('status', result.paid ? 'success' : 'pending')
    resultUrl.searchParams.set('orderNumber', result.orderNumber)
    return NextResponse.redirect(resultUrl)
  } catch (error) {
    console.error('Stitch Express callback verification failed:', error instanceof StitchCheckoutError ? error.code : error)
    resultUrl.searchParams.set('status', 'pending')
    resultUrl.searchParams.set('message', 'We could not confirm your payment yet. Please contact Sunder Computers before paying again.')
    return NextResponse.redirect(resultUrl)
  }
}
