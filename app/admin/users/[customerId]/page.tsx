import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import styles from '../users.module.css'

export const dynamic = 'force-dynamic'

type UserDetailsPageProps = {
  params: Promise<{ customerId: string }>
}

const currency = (value: number) => new Intl.NumberFormat('en-ZA', {
  style: 'currency', currency: 'ZAR', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(value)

const paymentLabels: Record<string, string> = {
  stitch: 'Stitch Express',
  stitchPayLater: 'Stitch Pay Later',
  eft: 'EFT / Bank transfer',
  payflex: 'Payflex',
}

export default async function AdminUserDetailsPage({ params }: UserDetailsPageProps) {
  const { customerId } = await params
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      passwordHash: true,
      source: true,
      createdAt: true,
      orders: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          orderNumber: true,
          invoiceNumber: true,
          total: true,
          paymentStatus: true,
          paymentMethod: true,
          status: true,
          subtotal: true,
          shipping: true,
          items: {
            orderBy: { id: 'asc' },
            select: {
              id: true,
              imageUrl: true,
              name: true,
              stockNumber: true,
              quantity: true,
              condition: true,
              warranty: true,
              lineTotal: true,
            },
          },
        },
      },
    },
  })

  if (!customer) notFound()

  const lifetimeTotal = customer.orders.reduce((sum, order) => sum + order.total, 0)
  const paidTotal = customer.orders
    .filter((order) => order.paymentStatus.toLowerCase() === 'paid')
    .reduce((sum, order) => sum + order.total, 0)

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.backLink} href="/admin/users">← All users</Link>

        <header className={styles.profileHeader}>
          <div>
            <span className={styles.eyebrow}>{customer.passwordHash ? 'REGISTERED CUSTOMER' : 'CUSTOMER · PASSWORD SETUP NEEDED'}</span>
            <h1>{customer.fullName || 'Name not provided'}</h1>
            <div className={styles.contact}>
              <a href={`mailto:${customer.email}`}>{customer.email}</a>
              {customer.phone && <a href={`tel:${customer.phone}`}>{customer.phone}</a>}
              <span>Joined {customer.createdAt.toLocaleDateString('en-ZA')}</span>
            </div>
          </div>
          <div className={styles.profileMetrics}>
            <article><span>ORDERS</span><strong>{customer.orders.length}</strong></article>
            <article><span>ORDER TOTAL</span><strong>{currency(lifetimeTotal)}</strong></article>
            <article><span>PAID TOTAL</span><strong>{currency(paidTotal)}</strong></article>
          </div>
        </header>

        <div className={styles.sectionTitle}>
          <div><span className={styles.eyebrow}>ACCOUNT ACTIVITY</span><h2>Past orders</h2></div>
        </div>

        {customer.orders.length === 0 ? (
          <section className={styles.empty}>
            <h2>No orders yet</h2>
            <p>This customer account has not placed an order.</p>
          </section>
        ) : (
          <section className={styles.orderList} aria-label="Customer past orders">
            {customer.orders.map((order) => {
              const paid = order.paymentStatus.toLowerCase() === 'paid'
              const method = paymentLabels[order.paymentMethod || ''] || order.paymentMethod || 'Not selected'
              return (
                <article className={styles.order} key={order.id}>
                  <div className={styles.orderTop}>
                    <div>
                      <span className={styles.orderDate}>{order.createdAt.toLocaleString('en-ZA')}</span>
                      <h3>{order.orderNumber}</h3>
                      {order.invoiceNumber && <span className={styles.invoice}>Invoice INV-{String(order.invoiceNumber).padStart(6, '0')}</span>}
                    </div>
                    <strong className={styles.amount}>{currency(order.total)}</strong>
                  </div>
                  <div className={styles.orderMeta}>
                    <div><span>PAYMENT METHOD</span><strong>{method}</strong></div>
                    <div><span>PAYMENT STATUS</span><strong className={paid ? styles.paid : styles.pending}>{order.paymentStatus}</strong></div>
                    <div><span>ORDER STATUS</span><strong>{order.status}</strong></div>
                    <div><span>ITEMS</span><strong>{order.items.length}</strong></div>
                  </div>
                  <div className={styles.items}>
                    <span className={styles.itemHeading}>PURCHASED ITEMS</span>
                    {order.items.map((item) => (
                      <div className={styles.item} key={item.id}>
                        {item.imageUrl && <img src={item.imageUrl} alt="" />}
                        <div className={styles.itemName}>
                          <strong>{item.name}</strong>
                          <span>{item.stockNumber} · Qty {item.quantity}{item.condition ? ` · ${item.condition}` : ''}</span>
                          {item.warranty && <span>Warranty: {item.warranty}</span>}
                        </div>
                        <strong className={styles.itemTotal}>{currency(item.lineTotal)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className={styles.orderTotals}>
                    <span>Subtotal {currency(order.subtotal)}</span>
                    {order.shipping > 0 && <span>Shipping {currency(order.shipping)}</span>}
                    <strong>Total {currency(order.total)}</strong>
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
