import Link from 'next/link'
import styles from '../checkout.module.css'

export default function StitchPaymentResultPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.success}>
          <div className={styles.successIcon}>✓</div>
          <h1>We’re confirming your payment</h1>
          <p>Stitch has returned you to Sunder Computers. We’ll update your order as soon as we receive and verify Stitch’s payment confirmation.</p>
          <p>Please allow a short time for confirmation, then check your account order history. Do not make another payment while this payment is being confirmed.</p>
          <Link href="/account" className={styles.primaryButton}>View your orders</Link>
          <Link href="/shop" className={styles.primaryButton}>Back to Shop</Link>
        </section>
      </div>
    </main>
  )
}
