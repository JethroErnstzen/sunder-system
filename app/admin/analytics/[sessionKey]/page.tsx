import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { locationLabel } from '@/lib/analytics-location'
import { prisma } from '@/lib/prisma'
import styles from '../analytics.module.css'
import detail from './detail.module.css'
import RefreshAnalytics from '../RefreshAnalytics'

export const dynamic = 'force-dynamic'

const labels: Record<string, string> = {
  page_view: 'Viewed page', product_view: 'Viewed product', page_time: 'Time on page', heartbeat: 'Active',
  sign_up: 'Created account', sign_in: 'Signed in', add_to_cart: 'Added to cart', remove_from_cart: 'Removed from cart',
  cart_view: 'Viewed cart', cart_item_view: 'Cart contained item', cart_quantity: 'Changed cart quantity', checkout_view: 'Viewed checkout',
  checkout_started: 'Started checkout', checkout_submitted: 'Checkout item', order_submitted: 'Submitted order',
}
const dateTime = (date: Date) => new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Johannesburg' }).format(date)
const elapsed = (ms: number) => ms < 60_000 ? `${Math.round(ms / 1000)} sec` : `${Math.floor(ms / 60_000)} min ${Math.round(ms % 60_000 / 1000)} sec`

export default async function AnalyticsSessionPage({ params }: { params: Promise<{ sessionKey: string }> }) {
  if (!(await isAdminAuthenticated())) redirect('/admin-login')
  const { sessionKey } = await params
  const session = await prisma.analyticsSession.findUnique({
    where: { sessionKey },
    include: {
      customer: { select: { id: true, fullName: true, email: true } },
      events: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!session) notFound()
  const spent = session.events.reduce((sum, event) => sum + (event.eventType === 'page_time' ? event.durationMs || 0 : 0), 0)
  const visitLength = session.lastSeenAt.getTime() - session.firstSeenAt.getTime()
  const visibleEvents = session.events.filter(event => event.eventType !== 'heartbeat')
  const firstPage = session.landingPage || visibleEvents[0]?.path || 'Not recorded'

  return <main className={styles.page}>
    <div className={`${styles.shell} ${detail.shell}`}>
      <Link href="/admin/analytics" className={detail.back}>← All visitor activity</Link>
      <header className={detail.header}>
        <div><span className={detail.kicker}>VISITOR JOURNEY</span><h1>{session.customer?.fullName || session.customer?.email || `Visitor #${session.visitorKey.slice(0, 8)}`}</h1>
          {session.customer && <p><Link href={`/admin/users/${session.customer.id}`}>{session.customer.fullName || session.customer.email} · Customer profile →</Link></p>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <span className={detail.active}>{Date.now() - session.lastSeenAt.getTime() < 45_000 ? 'Active now' : 'Visit ended'}</span>
          <RefreshAnalytics />
        </div>
      </header>

      <section className={detail.summary}>
        <article><span>Started</span><strong>{dateTime(session.firstSeenAt)}</strong></article>
        <article><span>Last active</span><strong>{dateTime(session.lastSeenAt)}</strong></article>
        <article><span>Time on pages</span><strong>{elapsed(spent)}</strong></article>
        <article><span>Visit span</span><strong>{elapsed(Math.max(0, visitLength))}</strong></article>
        <article><span>Referral source</span><strong>{session.campaignName || session.source}</strong><small>{session.referrerHost || (session.source === 'direct' ? 'Direct visit' : '')}</small></article>
        <article><span>Approximate location</span><strong>{locationLabel(session)}</strong></article>
        {(session.campaignSource || session.campaignMedium) && <article><span>Campaign</span><strong>{[session.campaignSource, session.campaignMedium].filter(Boolean).join(' / ')}</strong></article>}
        <article><span>First page</span><strong className={detail.path}>{firstPage}</strong></article>
        <article><span>Last page</span><strong className={detail.path}>{session.lastPage}</strong></article>
      </section>

      <section className={detail.timelinePanel}>
        <div className={detail.timelineHeading}><div><h2>Journey timeline</h2><p>Page views, time spent, account, cart and checkout events</p></div><strong>{visibleEvents.length} events</strong></div>
        {!visibleEvents.length ? <p className={detail.empty}>No journey events were captured for this visit.</p> : <ol className={detail.timeline}>
          {visibleEvents.map(event => <li key={event.id}>
            <span className={detail.dot} />
            <div className={detail.eventCard}>
              <div className={detail.eventTop}><strong>{labels[event.eventType] || event.eventType}</strong><time>{dateTime(event.createdAt)}</time></div>
              <div className={detail.eventPage}>
                <strong>{event.path}</strong>
                {event.title && event.title !== event.path && <span>{event.title}</span>}
              </div>
              {event.productName && <div className={detail.product}><strong>{event.productName}</strong><span>Stock {event.productStockNumber}{event.quantity != null ? ` · Qty ${event.quantity}` : ''}</span></div>}
              {!event.productName && event.quantity != null && <div className={detail.meta}>Quantity: {event.quantity}</div>}
              {event.durationMs != null && <div className={detail.meta}>Spent {elapsed(event.durationMs)} on this page</div>}
              {event.paymentMethod && <div className={detail.meta}>Payment: {event.paymentMethod}</div>}
            </div>
          </li>)}
        </ol>}
      </section>
    </div>
  </main>
}
