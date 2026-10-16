import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { locationLabel } from '@/lib/analytics-location'
import { prisma } from '@/lib/prisma'
import RefreshAnalytics from './RefreshAnalytics'
import styles from './analytics.module.css'

export const dynamic = 'force-dynamic'

function startOfToday() {
  const local = new Date(Date.now() + 2 * 60 * 60 * 1000)
  local.setUTCHours(0, 0, 0, 0)
  return new Date(local.getTime() - 2 * 60 * 60 * 1000)
}
function labelDate(date: Date) {
  return new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', timeZone: 'Africa/Johannesburg' }).format(date)
}
function time(date: Date) {
  return new Intl.DateTimeFormat('en-ZA', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg' }).format(date)
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  if (!(await isAdminAuthenticated())) redirect('/admin-login')
  const query = await searchParams
  const parsedPage = Number.parseInt(query.page || '1', 10)
  const pageNumber = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1
  const pageSize = 100
  const now = new Date()
  const today = startOfToday()
  const liveAfter = new Date(now.getTime() - 45_000)
  const weekAfter = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
  const retentionAfter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const sessionWhere = { lastSeenAt: { gte: retentionAfter } }
  const [liveVisitors, todayVisitors, todayViews, todayCarts, todayCheckouts, recentVisitors, totalVisitors, weekEvents, locationGroups] = await Promise.all([
    prisma.analyticsSession.findMany({ where: { lastSeenAt: { gte: liveAfter } }, distinct: ['visitorKey'], select: { visitorKey: true } }),
    prisma.analyticsSession.findMany({ where: { lastSeenAt: { gte: today } }, distinct: ['visitorKey'], select: { visitorKey: true } }),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: today }, eventType: { in: ['page_view', 'product_view'] } } }),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: today }, eventType: 'add_to_cart' } }),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: today }, eventType: 'order_submitted' } }),
    prisma.analyticsSession.groupBy({
      by: ['visitorKey'],
      where: sessionWhere,
      _max: { lastSeenAt: true },
      _count: { _all: true },
      orderBy: { _max: { lastSeenAt: 'desc' } },
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
    }),
    prisma.analyticsSession.findMany({ where: sessionWhere, distinct: ['visitorKey'], select: { visitorKey: true } }),
    prisma.analyticsEvent.findMany({ where: { createdAt: { gte: weekAfter }, eventType: { in: ['page_view', 'product_view', 'add_to_cart', 'order_submitted', 'sign_in', 'sign_up'] } }, select: { createdAt: true } }),
    prisma.analyticsSession.groupBy({
      by: ['city', 'region', 'country'],
      where: { ...sessionWhere, city: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { _all: 'desc' } },
      take: 12,
    }),
  ])
  const visitorKeys = recentVisitors.map(visitor => visitor.visitorKey)
  const latestSessions = visitorKeys.length ? await prisma.analyticsSession.findMany({
    where: { ...sessionWhere, visitorKey: { in: visitorKeys } },
    orderBy: { lastSeenAt: 'desc' },
    select: {
      visitorKey: true, firstSeenAt: true, lastSeenAt: true,
      landingPage: true, lastPage: true, source: true, referrerHost: true, campaignName: true,
      city: true, region: true, country: true,
      customer: { select: { fullName: true, email: true } },
      _count: { select: { events: true } },
    },
  }) : []
  const latestByVisitor = new Map<string, (typeof latestSessions)[number]>()
  for (const session of latestSessions) {
    if (!latestByVisitor.has(session.visitorKey)) latestByVisitor.set(session.visitorKey, session)
  }
  const pageCount = Math.max(1, Math.ceil(totalVisitors.length / pageSize))
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekAfter.getTime() + index * 24 * 60 * 60 * 1000)
    const next = new Date(date.getTime() + 24 * 60 * 60 * 1000)
    return { label: labelDate(date), value: weekEvents.filter(event => event.createdAt >= date && event.createdAt < next).length }
  })
  const maxActivity = Math.max(1, ...days.map(day => day.value))

  return <main className={styles.page}>
    <div className={styles.shell}>
      <header className={styles.header}>
        <div><span className={styles.kicker}>SUNDER ADMIN</span><h1>Visitor activity</h1><p>Customer journeys, referral sources, cart actions and checkout activity across visits to the store.</p></div>
        <RefreshAnalytics />
      </header>
      <section className={styles.metrics}>
        <Link className={styles.metricLink} href="/admin/analytics/report/active-now"><span>Viewing now</span><strong>{liveVisitors.length}</strong><small>Active browsers · last 45 seconds</small></Link>
        <Link className={styles.metricLink} href="/admin/analytics/report/today-visitors"><span>Visitors today</span><strong>{todayVisitors.length}</strong><small>Unique browser IDs · South African day</small></Link>
        <Link className={styles.metricLink} href="/admin/analytics/report/pages-today"><span>Pages viewed today</span><strong>{todayViews}</strong><small>Page and product views</small></Link>
        <Link className={styles.metricLink} href="/admin/analytics/report/cart-today"><span>Added to cart today</span><strong>{todayCarts}</strong><small>Tracked add actions</small></Link>
        <article><span>Orders submitted today</span><strong>{todayCheckouts}</strong><small>Includes payment awaiting confirmation</small></article>
      </section>

      <section className={styles.chartPanel}>
        <div className={styles.sectionHeading}><div><h2>Activity over 7 days</h2><p>Page views, account actions, cart additions and submitted orders</p></div><strong>{weekEvents.length} events</strong></div>
        <div className={styles.chart} role="img" aria-label="Daily activity bar chart for the last seven days">
          {days.map((day, index) => <div className={styles.chartColumn} key={`${day.label}-${index}`}>
            <strong>{day.value}</strong>
            <div className={styles.barTrack}><i style={{ height: `${Math.max(day.value ? 8 : 2, day.value / maxActivity * 100)}%` }} /></div>
            <span>{day.label}</span>
          </div>)}
        </div>
      </section>

      <section className={styles.sessionPanel}>
        <div className={styles.sectionHeading}><div><h2>Visits by location · last 90 days</h2><p>Approximate locations based on visitor network data.</p></div><Link href="/admin/analytics/report/locations">View location report →</Link></div>
        {!locationGroups.length ? <div className={styles.empty}>No city data has been received from the hosting network yet.</div> :
          <div className={styles.locationGrid}>{locationGroups.map((group, index) => <article className={styles.locationCard} key={`${group.city}-${group.region}-${group.country}-${index}`}>
            <strong>{[group.city, group.region, group.country].filter(Boolean).join(', ')}</strong><span>{group._count._all} visits</span>
          </article>)}</div>}
      </section>

      <section className={styles.sessionPanel}>
        <div className={styles.sectionHeading}><div><h2>Visitors · last 90 days</h2><p>One row per browser ID. Open a visitor to see all their visits and activity.</p></div><strong>{totalVisitors.length} visitors</strong></div>
        {!recentVisitors.length ? <div className={styles.empty}>No visitor activity has been recorded yet.</div> :
          <div className={styles.tableWrap}><table><thead><tr><th>Visitor</th><th>Visits</th><th>Location</th><th>Last page</th><th>Source</th><th>Last active</th><th>Latest visit events</th></tr></thead><tbody>
            {recentVisitors.map(visitor => {
              const session = latestByVisitor.get(visitor.visitorKey)
              if (!session) return null
              return <tr key={visitor.visitorKey}>
              <td><Link href={`/admin/analytics/visitor/${visitor.visitorKey}`}><strong>{session.customer?.fullName || session.customer?.email || `Visitor #${visitor.visitorKey.slice(0, 8)}`}</strong>{session.customer && <small>Customer account</small>}</Link></td>
              <td>{visitor._count._all}</td><td>{locationLabel(session)}</td><td title={session.lastPage}>{session.lastPage}</td>
              <td>{session.campaignName || session.source}{session.referrerHost && <small>{session.referrerHost}</small>}</td>
              <td>{labelDate(session.lastSeenAt)} · {time(session.lastSeenAt)}</td><td>{session._count.events}</td>
            </tr>})}
          </tbody></table></div>}
        {totalVisitors.length > pageSize && <nav className={styles.pagination} aria-label="Visitor pages">
          {pageNumber > 1 ? <Link href={`/admin/analytics?page=${pageNumber - 1}`}>← Newer visits</Link> : <span />}
          <span>Page {pageNumber} of {pageCount}</span>
          {pageNumber < pageCount ? <Link href={`/admin/analytics?page=${pageNumber + 1}`}>Older visits →</Link> : <span />}
        </nav>}
      </section>
      <p className={styles.retention}>Analytics details are retained for up to 90 days. A visit is considered active if its browser sent a signal in the last 45 seconds.</p>
    </div>
  </main>
}
