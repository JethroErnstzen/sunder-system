import Link from 'next/link'
import { markStitchPaymentFromExpress, StitchCheckoutError } from '@/lib/stitch-payments'
import styles from '@/app/checkout/checkout.module.css'

type PaymentResult = {
  paid: boolean
  orderNumber: string | null
  verified: boolean
}

export default async function StitchPaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ payment_id?: string; reference?: string }>
}) {
  const { payment_id: paymentId, reference } = await searchParams
  let result: PaymentResult = { paid: false, orderNumber: null, verified: false }

  if (paymentId && reference && paymentId.length <= 256 && reference.length <= 256) {
    try {
      const verified = await markStitchPaymentFromExpress(paymentId, reference)
      result = { ...verified, verified: true }
    } catch (error) {
      console.error(
        'Stitch payment result verification failed:',
        error instanceof StitchCheckoutError ? error.code : error,
      )
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.success}>
          <div className={styles.successIcon}>{result.paid ? '✓' : '…'}</div>
          <h1>
            {result.paid ? 'Payment confirmed' : 'Payment not confirmed yet'}
          </h1>
          {result.orderNumber && <p>Order {result.orderNumber}</p>}
          <p>
            {result.paid
              ? 'Stitch confirmed your payment. Your order is being prepared.'
              : result.verified
                ? 'Stitch has not confirmed this payment yet. Your order status will update when confirmation arrives. Please do not pay again while it is being confirmed.'
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
