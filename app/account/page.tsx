import Link from 'next/link'
import { getCurrentCustomer } from '@/lib/customer-auth'
import { prisma } from '@/lib/prisma'
import SignOutButton from '@/app/components/SignOutButton'
import { CustomerLoginForm } from '@/app/components/CustomerAccountForms'
import CustomerProfileEditor from '@/app/components/CustomerProfileEditor'
import styles from './account.module.css'

const money = (amount: number) => `R${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const paymentLabels: Record<string, string> = {
  stitch: 'Stitch Express',
  stitchPayLater: 'Stitch Pay Later',
  eft: 'EFT / Bank transfer',
  payflex: 'Payflex',
}

export default async function AccountPage() {
  const customer = await getCurrentCustomer()
  if (!customer) {
    return (
      <main className={`${styles.page} ${styles.signInPage}`}>
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

  const editableProfile = {
    email: customer.email,
    fullName: customer.fullName || '',
    phone: customer.phone || '',
    addresses: customer.addresses.map((address) => ({
      id: address.id,
      label: address.label,
      recipientName: address.recipientName || customer.fullName || '',
      phone: address.phone || customer.phone || '',
      addressLine1: address.addressLine1,
      suburb: address.suburb,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
    })),
  }

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

        <CustomerProfileEditor profile={editableProfile} />

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
                <details className={styles.order} key={order.id}>
                  <summary className={styles.orderHeading}>
                    <div><span>Order</span><strong>{order.orderNumber}</strong></div>
                    <div><span>{order.createdAt.toLocaleDateString('en-ZA')}</span><strong>{money(order.total)}</strong></div>
                    <span className={styles.expandHint}>View details</span>
                  </summary>
                  <div className={styles.orderDetail}>
                    <div className={styles.orderStatus}>
                      <span>Order: {order.status.replaceAll('_', ' ')}</span>
                      <span>Payment: {order.paymentStatus.replaceAll('_', ' ')}</span>
                      {order.paymentMethod && <span>Method: {paymentLabels[order.paymentMethod] || order.paymentMethod}</span>}
                      {order.invoiceNumber && <span>Invoice: INV-{String(order.invoiceNumber).padStart(6, '0')}</span>}
                      {order.couponCode && <span>Discount: {order.couponCode} · saved {money(order.discount)}</span>}
                    </div>
                    <ul>
                      {order.items.map((item) => (
                        <li key={item.id}>
                          <div><strong>{item.name}</strong><small>{item.stockNumber} · Qty {item.quantity}{item.condition ? ` · ${item.condition}` : ''}{item.warranty ? ` · Warranty: ${item.warranty}` : ''}</small></div>
                          <span>{money(item.lineTotal)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className={styles.orderTotals}>
                      <span>Subtotal <strong>{money(order.subtotal)}</strong></span>
                      {order.discount > 0 && <span>Discount <strong>−{money(order.discount)}</strong></span>}
                      {order.shipping > 0 && <span>Shipping <strong>{money(order.shipping)}</strong></span>}
                      {order.tax > 0 && <span>VAT <strong>{money(order.tax)}</strong></span>}
                      <span className={styles.grandTotal}>Total <strong>{money(order.total)}</strong></span>
                    </div>
                    {(order.billingAddress || order.shippingAddress) && (
                      <div className={styles.orderAddresses}>
                        {order.billingAddress && <div><strong>Billing address</strong><span>{[order.firstName, order.lastName].filter(Boolean).join(' ')}</span><span>{[order.billingAddress, order.billingSuburb, order.billingCity, order.billingProvince, order.billingPostalCode].filter(Boolean).join(', ')}</span></div>}
                        {order.shippingAddress && <div><strong>Delivery address</strong><span>{[order.shippingAddress, order.shippingSuburb, order.shippingCity, order.shippingProvince, order.shippingPostalCode].filter(Boolean).join(', ')}</span></div>}
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
