import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { locationLabel } from '@/lib/analytics-location'
import { prisma } from '@/lib/prisma'
import styles from '../../analytics.module.css'
import reportStyles from './report.module.css'
import RefreshAnalytics from '../../RefreshAnalytics'

export const dynamic = 'force-dynamic'

function startOfToday() {
  const local = new Date(Date.now() + 2 * 60 * 60 * 1000)
  local.setUTCHours(0, 0, 0, 0)
  return new Date(local.getTime() - 2 * 60 * 60 * 1000)
}
const dateTime = (date: Date) => new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Johannesburg' }).format(date)

const sessionSelection = {
  visitorKey: true,
  sessionKey: true,
  firstSeenAt: true,
  lastSeenAt: true,
  lastPage: true,
  city: true,
  region: true,
  country: true,
  customer: { select: { id: true, fullName: true, email: true } },
} as const
type VisitorSession = {
  visitorKey: string
  sessionKey: string
  firstSeenAt: Date
  lastSeenAt: Date
  lastPage: string
  city: string | null
  region: string | null
  country: string | null
  customer: { id: string; fullName: string | null; email: string } | null
}
type CartEvent = {
  id: string
  path: string
  createdAt: Date
  productName: string | null
  productStockNumber: string | null
  quantity: number | null
  session: VisitorSession
}

export default async function AnalyticsReportPage({ params }: { params: Promise<{ report: string }> }) {
  if (!(await isAdminAuthenticated())) redirect('/admin-login')
  const { report } = await params
  const now = new Date()
  const today = startOfToday()
  const liveAfter = new Date(now.getTime() - 45_000)
  const locationReport = report === 'locations'
  const visitorReport = report === 'today-visitors' || report === 'active-now' || locationReport
  const pageReport = report === 'pages-today'
  const cartReport = report === 'cart-today'
  if (!visitorReport && !pageReport && !cartReport) notFound()

  const title = report === 'active-now' ? 'Viewing now' : report === 'today-visitors' ? 'Visitors today' : report === 'pages-today' ? 'Pages viewed today' : report === 'locations' ? 'Visitor locations' : 'Added to cart today'
  let sessions: VisitorSession[] = []
  let pageSummary: { path: string; views: number; visitors: number; durationMs: number }[] = []
  let cartEvents: CartEvent[] = []

  if (visitorReport) {
    const retentionAfter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const sessionWhere = report === 'active-now'
      ? { lastSeenAt: { gte: liveAfter } }
      : report === 'today-visitors'
        ? { lastSeenAt: { gte: today } }
        : { lastSeenAt: { gte: retentionAfter }, OR: [{ city: { not: null } }, { region: { not: null } }, { country: { not: null } }] }
    const allSessions = await prisma.analyticsSession.findMany({
      where: sessionWhere,
      orderBy: { lastSeenAt: 'desc' },
      select: sessionSelection,
    })
    const latestByVisitor = new Map<string, (typeof allSessions)[number]>()
    for (const session of allSessions) {
      if (!latestByVisitor.has(session.visitorKey)) latestByVisitor.set(session.visitorKey, session)
    }
    sessions = [...latestByVisitor.values()]
  } else if (pageReport) {
    const events = await prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: today }, eventType: { in: ['page_view', 'product_view', 'page_time'] } },
      select: { eventType: true, path: true, durationMs: true, session: { select: { visitorKey: true } } },
    })
    const pages = new Map<string, { views: number; visitors: Set<string>; durationMs: number }>()
    for (const event of events) {
      const item = pages.get(event.path) || { views: 0, visitors: new Set<string>(), durationMs: 0 }
      if (event.eventType === 'page_view' || event.eventType === 'product_view') {
        item.views += 1
        item.visitors.add(event.session.visitorKey)
      }
      if (event.eventType === 'page_time') item.durationMs += event.durationMs || 0
      pages.set(event.path, item)
    }
    pageSummary = [...pages.entries()].map(([path, item]) => ({ path, views: item.views, visitors: item.visitors.size, durationMs: item.durationMs })).sort((a, b) => b.views - a.views)
  } else {
    cartEvents = await prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: today }, eventType: 'add_to_cart' },
      orderBy: { createdAt: 'desc' },
      include: { session: { select: sessionSelection } },
    })
  }

  const locations = new Map<string, number>()
  for (const session of sessions) {
    const label = locationLabel(session)
    locations.set(label, (locations.get(label) || 0) + 1)
  }

  return <main className={styles.page}>
    <div className={`${styles.shell} ${reportStyles.shell}`}>
      <Link href="/admin/analytics" className={reportStyles.back}>← Visitor activity</Link>
      <header className={reportStyles.header}><div><span className={styles.kicker}>SUNDER ADMIN</span><h1>{title}</h1><p>{report === 'active-now' ? 'Visitors active in the last 45 seconds.' : report === 'locations' ? 'Approximate locations recorded over the last 90 days.' : 'Activity recorded since midnight, South African time.'}</p></div><RefreshAnalytics /></header>

      {visitorReport && <>
        <section className={styles.sessionPanel}>
          <div className={styles.sectionHeading}><div><h2>{locationReport ? 'Visitors by location' : 'Visitors and locations'}</h2><p>Each visitor is counted once, using their latest visit in this period.</p></div><strong>{sessions.length} visitors</strong></div>
          {!sessions.length ? <div className={styles.empty}>No visitors in this period.</div> : <div className={styles.tableWrap}><table><thead><tr><th>Visitor</th><th>Location</th><th>Last page</th><th>First seen</th><th>Last active</th></tr></thead><tbody>
            {sessions.map(session => <tr key={session.visitorKey}>
              <td><Link href={`/admin/analytics/visitor/${session.visitorKey}`}><strong>{session.customer?.fullName || session.customer?.email || `Visitor #${session.visitorKey.slice(0, 8)}`}</strong>{session.customer && <small>Customer account</small>}</Link></td>
              <td>{locationLabel(session)}</td><td title={session.lastPage}>{session.lastPage}</td><td>{dateTime(session.firstSeenAt)}</td><td>{dateTime(session.lastSeenAt)}</td>
            </tr>)}
          </tbody></table></div>}
        </section>
        <section className={styles.sessionPanel}>
          <div className={styles.sectionHeading}><div><h2>Visitors by location</h2><p>Unique visitors by their latest location in this period.</p></div></div>
          {!locations.size ? <div className={styles.empty}>City data is not available from the hosting network yet.</div> : <div className={styles.locationGrid}>{[...locations.entries()].sort((a, b) => b[1] - a[1]).map(([location, count]) => <article className={styles.locationCard} key={location}><strong>{location}</strong><span>{count} visitors</span></article>)}</div>}
        </section>
      </>}

      {pageReport && <section className={styles.sessionPanel}>
        <div className={styles.sectionHeading}><div><h2>Page activity</h2><p>Page and product views, unique browsers, and total recorded time on each page.</p></div><strong>{pageSummary.reduce((sum, page) => sum + page.views, 0)} views</strong></div>
        {!pageSummary.length ? <div className={styles.empty}>No page views recorded today.</div> : <div className={styles.tableWrap}><table><thead><tr><th>Page path</th><th>Views</th><th>Visitors</th><th>Total time</th><th>Average time per view</th></tr></thead><tbody>
          {pageSummary.map(page => <tr key={page.path}><td className={reportStyles.path}>{page.path}</td><td>{page.views}</td><td>{page.visitors}</td><td>{Math.round(page.durationMs / 1000)} sec</td><td>{page.views ? Math.round(page.durationMs / page.views / 1000) : 0} sec</td></tr>)}
        </tbody></table></div>}
      </section>}

      {cartReport && <section className={styles.sessionPanel}>
        <div className={styles.sectionHeading}><div><h2>Cart additions</h2><p>Who added which product, how many, and where they were browsing from.</p></div><strong>{cartEvents.length} additions</strong></div>
        {!cartEvents.length ? <div className={styles.empty}>No items were added to cart today.</div> : <div className={styles.tableWrap}><table><thead><tr><th>Visitor</th><th>Product</th><th>Quantity</th><th>Location</th><th>Page</th><th>Time</th></tr></thead><tbody>
          {cartEvents.map(event => <tr key={event.id}>
            <td><Link href={`/admin/analytics/visitor/${event.session.visitorKey}`}><strong>{event.session.customer?.fullName || event.session.customer?.email || `Visitor #${event.session.visitorKey.slice(0, 8)}`}</strong></Link></td>
            <td>{event.productName || event.productStockNumber || 'Product unavailable'}{event.productStockNumber && <small>Stock {event.productStockNumber}</small>}</td>
            <td>{event.quantity ?? '—'}</td><td>{locationLabel(event.session)}</td><td>{event.path}</td><td>{dateTime(event.createdAt)}</td>
          </tr>)}
        </tbody></table></div>}
      </section>}
    </div>
  </main>
}
