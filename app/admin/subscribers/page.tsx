import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import styles from '../users/users.module.css'

export const dynamic = 'force-dynamic'

export default async function AdminSubscribersPage() {
  if (!await isAdminAuthenticated()) redirect('/admin-login')

  const [subscriberCount, subscribers] = await Promise.all([
    prisma.subscriber.count(),
    prisma.subscriber.findMany({ orderBy: { createdAt: 'desc' } }),
  ])

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>SUNDER ADMIN</span>
            <h1>Newsletter subscribers</h1>
            <p>People who opted in to receive product updates and special offers.</p>
          </div>
          <div className={styles.headerActions}>
            <Link className={styles.importLink} href="/api/admin/subscribers/export">Download CSV</Link>
            <div className={styles.totalCard}>
              <span>SUBSCRIBERS</span>
              <strong>{subscriberCount}</strong>
            </div>
          </div>
        </header>

        {subscribers.length === 0 ? (
          <section className={styles.empty}>
            <h2>No subscribers yet</h2>
            <p>Newsletter signups from the website will appear here.</p>
          </section>
        ) : (
          <section className={styles.tableWrap} aria-label="Newsletter subscribers">
            <table className={styles.table}>
              <thead>
                <tr><th>Email</th><th>Subscribed</th><th>Source</th><th>Consent recorded</th></tr>
              </thead>
              <tbody>
                {subscribers.map((subscriber) => (
                  <tr key={subscriber.id}>
                    <td><a href={`mailto:${subscriber.email}`}>{subscriber.email}</a></td>
                    <td>{subscriber.createdAt.toLocaleString('en-ZA')}</td>
                    <td>{subscriber.source}</td>
                    <td>{subscriber.consentAt.toLocaleString('en-ZA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  )
}
