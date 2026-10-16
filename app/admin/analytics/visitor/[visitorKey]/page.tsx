import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { locationLabel } from '@/lib/analytics-location'
import { prisma } from '@/lib/prisma'
import styles from '../../analytics.module.css'
import detail from '../../[sessionKey]/detail.module.css'
import visitorStyles from './visitor.module.css'
import RefreshAnalytics from '../../RefreshAnalytics'

export const dynamic = 'force-dynamic'

const labels: Record<string, string> = {
  page_view: 'Viewed page', product_view: 'Viewed product', page_time: 'Time on page',
  sign_up: 'Created account', sign_in: 'Signed in', add_to_cart: 'Added to cart',
  remove_from_cart: 'Removed from cart', cart_view: 'Viewed cart', cart_item_view: 'Cart contained item',
  cart_quantity: 'Changed cart quantity', checkout_view: 'Viewed checkout', checkout_started: 'Started checkout',
  checkout_submitted: 'Checkout item', order_submitted: 'Submitted order',
}
const dateTime = (date: Date) => new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Johannesburg' }).format(date)
const elapsed = (ms: number) => ms < 60_000 ? `${Math.round(ms / 1000)} sec` : `${Math.floor(ms / 60_000)} min ${Math.round(ms % 60_000 / 1000)} sec`

export default async function AnalyticsVisitorPage({ params }: { params: Promise<{ visitorKey: string }> }) {
  if (!(await isAdminAuthenticated())) redirect('/admin-login')
  const { visitorKey } = await params
  const sessions = await prisma.analyticsSession.findMany({
    where: { visitorKey },
    orderBy: { firstSeenAt: 'desc' },
    include: {
      customer: { select: { id: true, fullName: true, email: true } },
      events: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!sessions.length) notFound()
  const knownCustomer = sessions.find(session => session.customer)?.customer
  const earliest = sessions.reduce((oldest, session) => session.firstSeenAt < oldest ? session.firstSeenAt : oldest, sessions[0].firstSeenAt)
  const latestSession = sessions.reduce((latest, session) => session.lastSeenAt > latest.lastSeenAt ? session : latest, sessions[0])
  const totalEvents = sessions.reduce((sum, session) => sum + session.events.filter(event => event.eventType !== 'heartbeat').length, 0)

  return <main className={styles.page}>
    <div className={`${styles.shell} ${detail.shell} ${visitorStyles.shell}`}>
      <Link href="/admin/analytics" className={detail.back}>← All visitor activity</Link>
      <header className={detail.header}>
        <div><span className={detail.kicker}>RETURNING VISITOR</span><h1>{knownCustomer?.fullName || knownCustomer?.email || `Visitor #${visitorKey.slice(0, 8)}`}</h1>
          {knownCustomer && <p><Link href={`/admin/users/${knownCustomer.id}`}>{knownCustomer.fullName || knownCustomer.email} · Customer profile →</Link></p>}
        </div>
        <div className={visitorStyles.live}><span className={detail.active}>{Date.now() - latestSession.lastSeenAt.getTime() < 45_000 ? 'Active now' : 'Last active'}</span><RefreshAnalytics /></div>
      </header>

      <section className={detail.summary}>
        <article><span>Visits</span><strong>{sessions.length}</strong></article>
        <article><span>First seen</span><strong>{dateTime(earliest)}</strong></article>
        <article><span>Last active</span><strong>{dateTime(latestSession.lastSeenAt)}</strong></article>
        <article><span>Tracked events</span><strong>{totalEvents}</strong></article>
        <article><span>Latest page</span><strong className={detail.path}>{latestSession.lastPage}</strong></article>
        <article><span>Approximate location</span><strong>{locationLabel(latestSession)}</strong></article>
        <article><span>Latest source</span><strong>{latestSession.campaignName || latestSession.source}</strong><small>{latestSession.referrerHost || (latestSession.source === 'direct' ? 'Direct visit' : '')}</small></article>
      </section>

      <section className={visitorStyles.visits}>
        <div className={detail.timelineHeading}><div><h2>All visits</h2><p>Visits from this browser ID, with each journey kept in time order.</p></div><strong>{sessions.length} visits</strong></div>
        {sessions.map(session => {
          const events = session.events.filter(event => event.eventType !== 'heartbeat')
          const pageTime = session.events.reduce((sum, event) => sum + (event.eventType === 'page_time' ? event.durationMs || 0 : 0), 0)
          return <article className={visitorStyles.visit} key={session.id}>
            <header className={visitorStyles.visitHeader}>
              <div><h3>{dateTime(session.firstSeenAt)}</h3><p>Last active {dateTime(session.lastSeenAt)} · {events.length} events · {elapsed(pageTime)} on pages</p></div>
              <Link href={`/admin/analytics/${session.sessionKey}`}>Open visit details →</Link>
            </header>
            <div className={visitorStyles.pages}><span>Started at <strong>{session.landingPage || events[0]?.path || 'Not recorded'}</strong></span><span>Last page <strong>{session.lastPage}</strong></span></div>
            {!events.length ? <p className={visitorStyles.empty}>No detailed events were captured for this visit.</p> :
              <ol className={visitorStyles.events}>{events.map(event => <li key={event.id}>
                <div className={visitorStyles.eventHeading}><strong>{labels[event.eventType] || event.eventType}</strong><time>{dateTime(event.createdAt)}</time></div>
                <strong className={visitorStyles.path}>{event.path}</strong>
                {event.title && event.title !== event.path && <span className={visitorStyles.title}>{event.title}</span>}
                {event.productName && <span className={visitorStyles.meta}>{event.productName}{event.productStockNumber ? ` · Stock ${event.productStockNumber}` : ''}</span>}
                {event.quantity != null && <span className={visitorStyles.meta}>Quantity: {event.quantity}</span>}
                {event.durationMs != null && <span className={visitorStyles.meta}>Spent {elapsed(event.durationMs)} on this page</span>}
                {event.paymentMethod && <span className={visitorStyles.meta}>Payment: {event.paymentMethod}</span>}
              </li>)}</ol>}
          </article>
        })}
      </section>
    </div>
  </main>
}
