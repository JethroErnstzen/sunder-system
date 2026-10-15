import Link from 'next/link'
import { getCurrentCustomer } from '@/lib/customer-auth'
import { prisma } from '@/lib/prisma'
import SignOutButton from '@/app/components/SignOutButton'
import { CustomerLoginForm } from '@/app/components/CustomerAccountForms'
import styles from './account.module.css'

const money = (amount: number) => `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default async function AccountPage() {
  const customer = await getCurrentCustomer()
  if (!customer) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.header}>
            <div>
              <Link href="/" className={styles.back}>← Back to Sunder</Link>
              <span className={styles.eyebrow}>SUNDER COMPUTERS</span>
              <h1>My account</h1>
              <p>Sign in to view your orders, or create an account for faster checkout.</p>
            </div>
          </header>
          <section className={styles.orders}>
            <div className={styles.ordersHeading}><div><span className={styles.eyebrow}>WELCOME BACK</span><h2>Sign in</h2></div></div>
            <CustomerLoginForm />
            <div className={styles.empty}>
              <h3>New to Sunder online?</h3>
              <p>Create an account with your contact and delivery details. Your saved address will be ready at checkout.</p>
              <Link href="/register">Create an account</Link>
            </div>
          </section>
        </div>
      </main>
    )
  }

  const orders = await prisma.order.findMany({
    where: { email: customer.email.toLowerCase() },
    orderBy: { createdAt: 'desc' },
    include: { items: { orderBy: { id: 'asc' } } },
  })

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <Link href="/" className={styles.back}>← Back to Sunder</Link>
            <span className={styles.eyebrow}>SUNDER COMPUTERS</span>
            <h1>My account</h1>
            <p>{customer.fullName ? `Welcome, ${customer.fullName}.` : customer.email}</p>
          </div>
          <SignOutButton />
        </header>

        <section className={styles.orders}>
          <div className={styles.ordersHeading}>
            <div><span className={styles.eyebrow}>YOUR PURCHASES</span><h2>Order history</h2></div>
            <span>{orders.length} {orders.length === 1 ? 'order' : 'orders'}</span>
          </div>
          {orders.length === 0 ? (
            <div className={styles.empty}>
              <h3>No orders yet</h3>
              <p>Orders placed with this email on the new Sunder website will appear here. Purchases from the previous website are not included in this order history.</p>
              <Link href="/shop">Browse products</Link>
            </div>
          ) : (
            <div className={styles.orderList}>
              {orders.map((order) => (
                <article className={styles.order} key={order.id}>
                  <div className={styles.orderHeading}>
                    <div><span>Order</span><strong>{order.orderNumber}</strong></div>
                    <div><span>{order.createdAt.toLocaleDateString('en-ZA')}</span><strong>{money(order.total)}</strong></div>
                  </div>
                  <div className={styles.orderStatus}>
                    <span>Order: {order.status.replaceAll('_', ' ')}</span>
                    <span>Payment: {order.paymentStatus.replaceAll('_', ' ')}</span>
                    {order.paymentMethod && <span>Method: {order.paymentMethod === 'stitchPayLater' ? 'Stitch Pay Later' : order.paymentMethod}</span>}
                    {order.couponCode && <span>Discount: {order.couponCode} · saved {money(order.discount)}</span>}
                  </div>
                  <ul>
                    {order.items.map((item) => <li key={item.id}>{item.name} <span>× {item.quantity} · {money(item.lineTotal)}</span></li>)}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
