import { prisma } from '@/lib/prisma'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'
import styles from './orders.module.css'
import ResendOrderEmailsButton from './resend-email-button'

export const dynamic = 'force-dynamic'

const currency = (value: number) => new Intl.NumberFormat('en-ZA', {
  style: 'currency', currency: 'ZAR', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(value)

const paymentLabels: Record<string, string> = {
  stitch: 'Stitch Express',
  stitchPayLater: 'Stitch Pay Later',
  eft: 'EFT / Bank transfer',
  payflex: 'Payflex',
  coupon: 'Discount code',
}

function personName(order: { firstName: string | null; lastName: string | null; companyName: string | null }) {
  return [order.firstName, order.lastName].filter(Boolean).join(' ') || order.companyName || 'Customer'
}

export default async function AdminOrdersPage() {
  if (!(await isAdminAuthenticated())) redirect('/admin-login')
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    // Select the columns used on this page explicitly. The coupon columns were
    // added after the initial staging database sync, and Prisma's default
    // selection would request them even when the staging SQLite DB lacks them.
    select: {
      id: true,
      invoiceNumber: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      companyName: true,
      billingAddress: true,
      billingSuburb: true,
      billingCity: true,
      billingProvince: true,
      billingPostalCode: true,
      total: true,
      createdAt: true,
      items: {
        orderBy: { id: 'asc' },
        select: {
          id: true,
          name: true,
          stockNumber: true,
          quantity: true,
          condition: true,
          warranty: true,
          lineTotal: true,
        },
      },
    },
  })
  const paidOrders = orders.filter((order) => order.paymentStatus.toLowerCase() === 'paid')
  const awaitingOrders = orders.filter((order) => order.paymentStatus.toLowerCase() !== 'paid')
  const paidTotal = paidOrders.reduce((sum, order) => sum + order.total, 0)

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>SUNDER ADMIN</span>
            <h1>Orders</h1>
            <p>Every website order, with customer, payment method and purchased items.</p>
          </div>
          <a className={styles.inventoryLink} href="/admin/inventory">Manage inventory <span aria-hidden="true">→</span></a>
        </header>

        <section className={styles.metrics} aria-label="Order summary">
          <article><span>All orders</span><strong>{orders.length}</strong></article>
          <article><span>Paid</span><strong>{paidOrders.length}</strong></article>
          <article><span>Awaiting payment</span><strong>{awaitingOrders.length}</strong></article>
          <article><span>Paid order total</span><strong>{currency(paidTotal)}</strong></article>
        </section>

        {orders.length === 0 ? (
          <section className={styles.empty}>
            <h2>No orders yet</h2>
            <p>Orders placed through the website will appear here.</p>
          </section>
        ) : (
          <section className={styles.orderList} aria-label="Past orders">
            {orders.map((order) => {
              const paid = order.paymentStatus.toLowerCase() === 'paid'
              const name = personName(order)
              const method = paymentLabels[order.paymentMethod || ''] || order.paymentMethod || 'Not selected'
              const billingAddress = [order.billingAddress, order.billingSuburb, order.billingCity, order.billingProvince, order.billingPostalCode]
                .filter(Boolean).join(', ')

              return (
                <article className={styles.order} key={order.id}>
                  <div className={styles.orderTop}>
                    <div>
                      <span className={styles.orderDate}>{order.createdAt.toLocaleString('en-ZA')}</span>
                      <h2>{order.orderNumber}</h2>
                      {order.invoiceNumber && <span className={styles.invoiceNo}>Invoice INV-{String(order.invoiceNumber).padStart(6, '0')}</span>}
                    </div>
                    <div className={styles.amount}>{currency(order.total)}</div>
                  </div>

                  <div className={styles.details}>
                    <div className={styles.customer}>
                      <span className={styles.label}>PLACED BY</span>
                      <strong>{name}</strong>
                      {order.companyName && <span>{order.companyName}</span>}
                      <a href={`mailto:${order.email}`}>{order.email}</a>
                      {order.phone && <a href={`tel:${order.phone}`}>{order.phone}</a>}
                      {billingAddress && <span>{billingAddress}</span>}
                    </div>
                    <div className={styles.payment}>
                      <span className={styles.label}>PAYMENT</span>
                      <strong>{method}</strong>
                      <span className={`${styles.badge} ${paid ? styles.paid : styles.pending}`}>{order.paymentStatus}</span>
                      <span>Order status: {order.status}</span>
                    </div>
                    <div className={styles.purchased}>
                      <span className={styles.label}>PURCHASED</span>
                      <strong>{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</strong>
                      <details>
                        <summary>View items</summary>
                        <ul>
                          {order.items.map((item) => (
                            <li key={item.id}>
                              <div>
                                <strong>{item.name}</strong>
                                <span>{item.stockNumber} · Qty {item.quantity}{item.condition ? ` · ${item.condition}` : ''}</span>
                                {item.warranty && <span>Warranty: {item.warranty}</span>}
                              </div>
                              <span>{currency(item.lineTotal)}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  </div>
                  <div className={styles.orderEmailActions}>
                    {order.paymentMethod === 'payflex' && !paid
                      ? <span className={styles.emailPending}>Invoice and sales alert send after Payflex confirms payment.</span>
                      : <ResendOrderEmailsButton orderId={order.id} />}
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}
