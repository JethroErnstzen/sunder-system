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
      source: true,
      createdAt: true,
      updatedAt: true,
      addresses: {
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          label: true,
          recipientName: true,
          phone: true,
          addressLine1: true,
          suburb: true,
          city: true,
          province: true,
          postalCode: true,
          isDefault: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      orders: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          orderNumber: true,
          invoiceNumber: true,
          total: true,
          paymentStatus: true,
          paymentMethod: true,
          status: true,
          customerType: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          companyName: true,
          vatNumber: true,
          registrationNumber: true,
          billingAddress: true,
          billingSuburb: true,
          billingCity: true,
          billingProvince: true,
          billingPostalCode: true,
          shippingAddress: true,
          shippingSuburb: true,
          shippingCity: true,
          shippingProvince: true,
          shippingPostalCode: true,
          subtotal: true,
          shipping: true,
          tax: true,
          officeAddon: true,
          couponCode: true,
          discount: true,
          items: {
            orderBy: { id: 'asc' },
            select: {
              id: true,
              productId: true,
              imageUrl: true,
              name: true,
              stockNumber: true,
              quantity: true,
              unitPrice: true,
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
            <span className={styles.eyebrow}>CUSTOMER PROFILE</span>
            <h1>{customer.fullName || 'Name not provided'}</h1>
            <div className={styles.contact}>
              <a href={`mailto:${customer.email}`}>{customer.email}</a>
              {customer.phone && <a href={`tel:${customer.phone}`}>{customer.phone}</a>}
              <span>Added {customer.createdAt.toLocaleString('en-ZA')}</span>
            </div>
          </div>
          <div className={styles.profileMetrics}>
            <article><span>ORDERS</span><strong>{customer.orders.length}</strong></article>
            <article><span>ORDER TOTAL</span><strong>{currency(lifetimeTotal)}</strong></article>
            <article><span>PAID TOTAL</span><strong>{currency(paidTotal)}</strong></article>
          </div>
        </header>

        <section className={styles.profileDetails} aria-label="Customer details">
          <div className={styles.sectionTitle}><div><span className={styles.eyebrow}>ACCOUNT DETAILS</span><h2>Profile information</h2></div></div>
          <dl className={styles.detailGrid}>
            <div><dt>Full name</dt><dd>{customer.fullName || '—'}</dd></div>
            <div><dt>Email address</dt><dd>{customer.email}</dd></div>
            <div><dt>Phone number</dt><dd>{customer.phone || '—'}</dd></div>
            <div><dt>Account source</dt><dd>{customer.source || '—'}</dd></div>
            <div><dt>Customer ID</dt><dd>{customer.id}</dd></div>
            <div><dt>Profile last updated</dt><dd>{customer.updatedAt.toLocaleString('en-ZA')}</dd></div>
          </dl>
        </section>

        <section className={styles.addressSection} aria-label="Saved addresses">
          <div className={styles.sectionTitle}><div><span className={styles.eyebrow}>SAVED ADDRESSES</span><h2>Addresses</h2></div><span>{customer.addresses.length} saved</span></div>
          {!customer.addresses.length ? <p className={styles.noAddresses}>No saved addresses.</p> :
            <div className={styles.addressGrid}>{customer.addresses.map((address) => <article className={styles.addressCard} key={address.id}>
              <div className={styles.addressTitle}><strong>{address.label}</strong>{address.isDefault && <span>Default</span>}</div>
              <p>{address.recipientName || customer.fullName || '—'}{address.phone ? ` · ${address.phone}` : ''}</p>
              <p>{address.addressLine1}, {address.suburb}, {address.city}, {address.province}, {address.postalCode}</p>
              <small>Added {address.createdAt.toLocaleDateString('en-ZA')} · Updated {address.updatedAt.toLocaleDateString('en-ZA')}</small>
            </article>)}</div>}
        </section>

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
                    <div><span>CUSTOMER TYPE</span><strong>{order.customerType}</strong></div>
                    <div><span>ORDER EMAIL</span><strong>{order.email}</strong></div>
                    <div><span>PHONE</span><strong>{order.phone || '—'}</strong></div>
                    {order.companyName && <div><span>COMPANY</span><strong>{order.companyName}</strong></div>}
                    {order.vatNumber && <div><span>VAT NUMBER</span><strong>{order.vatNumber}</strong></div>}
                    {order.registrationNumber && <div><span>REGISTRATION</span><strong>{order.registrationNumber}</strong></div>}
                    <div><span>PAYMENT METHOD</span><strong>{method}</strong></div>
                    <div><span>PAYMENT STATUS</span><strong className={paid ? styles.paid : styles.pending}>{order.paymentStatus}</strong></div>
                    <div><span>ORDER STATUS</span><strong>{order.status}</strong></div>
                    <div><span>ITEMS</span><strong>{order.items.length}</strong></div>
                    {order.billingAddress && <div><span>BILLING ADDRESS</span><strong>{[order.billingAddress, order.billingSuburb, order.billingCity, order.billingProvince, order.billingPostalCode].filter(Boolean).join(', ')}</strong></div>}
                    {order.shippingAddress && <div><span>SHIPPING ADDRESS</span><strong>{[order.shippingAddress, order.shippingSuburb, order.shippingCity, order.shippingProvince, order.shippingPostalCode].filter(Boolean).join(', ')}</strong></div>}
                    {order.officeAddon && <div><span>OFFICE ADD-ON</span><strong>Yes</strong></div>}
                    {!!order.couponCode && <div><span>DISCOUNT CODE</span><strong>{order.couponCode} · {currency(order.discount)}</strong></div>}
                    <div><span>SUBTOTAL / VAT / SHIPPING</span><strong>{currency(order.subtotal)} / {currency(order.tax)} / {currency(order.shipping)}</strong></div>
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
