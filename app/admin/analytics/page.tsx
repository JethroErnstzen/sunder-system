import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/admin-auth'
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
  const [liveVisitors, todayVisitors, todayViews, todayCarts, todayCheckouts, recentSessions, totalSessions, weekEvents] = await Promise.all([
    prisma.analyticsSession.findMany({ where: { lastSeenAt: { gte: liveAfter } }, distinct: ['visitorKey'], select: { visitorKey: true } }),
    prisma.analyticsSession.findMany({ where: { lastSeenAt: { gte: today } }, distinct: ['visitorKey'], select: { visitorKey: true } }),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: today }, eventType: { in: ['page_view', 'product_view'] } } }),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: today }, eventType: 'add_to_cart' } }),
    prisma.analyticsEvent.count({ where: { createdAt: { gte: today }, eventType: 'order_submitted' } }),
    prisma.analyticsSession.findMany({
      where: sessionWhere,
      orderBy: { lastSeenAt: 'desc' },
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
      select: {
        sessionKey: true, firstSeenAt: true, lastSeenAt: true,
        landingPage: true, lastPage: true, source: true, referrerHost: true,
        campaignName: true,
        customer: { select: { fullName: true, email: true } },
        _count: { select: { events: true } },
      },
    }),
    prisma.analyticsSession.count({ where: sessionWhere }),
    prisma.analyticsEvent.findMany({ where: { createdAt: { gte: weekAfter }, eventType: { in: ['page_view', 'product_view', 'add_to_cart', 'order_submitted', 'sign_in', 'sign_up'] } }, select: { createdAt: true } }),
  ])
  const pageCount = Math.max(1, Math.ceil(totalSessions / pageSize))
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
        <article><span>Viewing now</span><strong>{liveVisitors.length}</strong><small>Active browsers · last 45 seconds</small></article>
        <article><span>Visitors today</span><strong>{todayVisitors.length}</strong><small>Unique browser IDs · South African day</small></article>
        <article><span>Pages viewed today</span><strong>{todayViews}</strong><small>Page and product views</small></article>
        <article><span>Added to cart today</span><strong>{todayCarts}</strong><small>Tracked add actions</small></article>
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
        <div className={styles.sectionHeading}><div><h2>Visitor journeys · last 90 days</h2><p>Open a visit to see page order, time spent, products and actions.</p></div><strong>{totalSessions} visits</strong></div>
        {!recentSessions.length ? <div className={styles.empty}>No visitor activity has been recorded yet.</div> :
          <div className={styles.tableWrap}><table><thead><tr><th>Visitor</th><th>First page</th><th>Last page</th><th>Source</th><th>Started</th><th>Last active</th><th>Events</th></tr></thead><tbody>
            {recentSessions.map(session => <tr key={session.sessionKey}>
              <td><Link href={`/admin/analytics/${session.sessionKey}`}><strong>{session.customer?.fullName || session.customer?.email || `Visit #${session.sessionKey.slice(0, 8)}`}</strong>{session.customer && <small>Customer account</small>}</Link></td>
              <td title={session.landingPage}>{session.landingPage}</td><td title={session.lastPage}>{session.lastPage}</td>
              <td>{session.campaignName || session.source}{session.referrerHost && <small>{session.referrerHost}</small>}</td>
              <td>{labelDate(session.firstSeenAt)} · {time(session.firstSeenAt)}</td><td>{labelDate(session.lastSeenAt)} · {time(session.lastSeenAt)}</td><td>{session._count.events}</td>
            </tr>)}
          </tbody></table></div>}
        {totalSessions > pageSize && <nav className={styles.pagination} aria-label="Visitor journey pages">
          {pageNumber > 1 ? <Link href={`/admin/analytics?page=${pageNumber - 1}`}>← Newer visits</Link> : <span />}
          <span>Page {pageNumber} of {pageCount}</span>
          {pageNumber < pageCount ? <Link href={`/admin/analytics?page=${pageNumber + 1}`}>Older visits →</Link> : <span />}
        </nav>}
      </section>
      <p className={styles.retention}>Analytics details are retained for up to 90 days. A visit is considered active if its browser sent a signal in the last 45 seconds.</p>
    </div>
  </main>
}
