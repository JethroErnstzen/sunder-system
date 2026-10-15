import Link from 'next/link'
import { markStitchPaymentFromExpress, StitchCheckoutError } from '@/lib/stitch-payments'
import { reconcilePayflexOrder } from '@/lib/payflex'
import styles from '@/app/checkout/checkout.module.css'

type PaymentResult = {
  paid: boolean
  orderNumber: string | null
  verified: boolean
  provider: 'Stitch' | 'Payflex'
  status?: string
}

export default async function StitchPaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ payment_id?: string; reference?: string; provider?: string; orderId?: string }>
}) {
  const { payment_id: paymentId, reference, provider: providerParam, orderId } = await searchParams
  const provider = providerParam === 'payflex' ? 'Payflex' : 'Stitch'
  let result: PaymentResult = { paid: false, orderNumber: null, verified: false, provider }

  if (provider === 'Payflex' && orderId && orderId.length <= 256) {
    try {
      const verified = await reconcilePayflexOrder(orderId)
      result = { ...verified, provider }
    } catch (error) {
      console.error(
        'Payflex payment result verification failed:',
        error instanceof Error ? error.message : error,
      )
    }
  } else if (provider === 'Stitch' && paymentId && reference && paymentId.length <= 256 && reference.length <= 256) {
    try {
      const verified = await markStitchPaymentFromExpress(paymentId, reference)
      result = { ...verified, verified: true, provider }
    } catch (error) {
      console.error(
        'Stitch payment result verification failed:',
        error instanceof StitchCheckoutError ? error.code : error,
      )
    }
  }

  const terminalFailure = ['cancelled', 'canceled', 'declined', 'abandoned'].includes(result.status || '')

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.success}>
          <div className={styles.successIcon}>{result.paid ? '✓' : '…'}</div>
          <h1>
            {result.paid ? 'Payment confirmed' : terminalFailure ? 'Payment was not completed' : 'Payment not confirmed yet'}
          </h1>
          {result.orderNumber && <p>Order {result.orderNumber}</p>}
          <p>
            {result.paid
              ? `${result.provider} confirmed your payment. Your order is being prepared.`
              : terminalFailure
                ? 'This payment was cancelled, declined, or abandoned. Please contact Sunder Computers to arrange another payment method.'
                : result.verified
                  ? `${result.provider} has not confirmed this payment yet. Your order status will update when confirmation arrives. Please do not pay again while it is being confirmed.`
                  : 'We could not verify this payment yet. Please contact Sunder Computers before trying to pay again.'}
          </p>
          <Link href="/account" className={styles.primaryButton}>
            View your orders
          </Link>
          <Link href="/shop" className={styles.primaryButton}>Back to Shop</Link>
        </section>
      </div>
    </main>
  )
}
