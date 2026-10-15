import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import styles from './users.module.css'

export const dynamic = 'force-dynamic'

type UsersPageProps = {
  searchParams: Promise<{ q?: string }>
}

export default async function AdminUsersPage({ searchParams }: UsersPageProps) {
  const query = (await searchParams).q?.trim() || ''
  const where = query
    ? {
        OR: [
          { fullName: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } },
        ],
      }
    : undefined

  const [customerCount, customers] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { orders: true } },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, total: true },
        },
      },
    }),
  ])

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>SUNDER ADMIN</span>
            <h1>Customers</h1>
            <p>Registered accounts and customers from orders, with their order history.</p>
          </div>
          <div className={styles.headerActions}>
            <Link className={styles.importLink} href="/admin/users/import">Import customers</Link>
            <div className={styles.totalCard}>
              <span>ALL CUSTOMERS</span>
              <strong>{customerCount}</strong>
            </div>
          </div>
        </header>

        <form className={styles.search} action="/admin/users" method="get">
          <label className={styles.visuallyHidden} htmlFor="user-search">Search customers</label>
          <input id="user-search" name="q" type="search" defaultValue={query} placeholder="Search by name, email or phone" />
          <button type="submit">Search</button>
          {query && <Link href="/admin/users">Clear</Link>}
        </form>

        {customers.length === 0 ? (
          <section className={styles.empty}>
            <h2>{query ? 'No matching customers' : 'No customers yet'}</h2>
            <p>{query ? 'Try another name, email address or phone number.' : 'Customers who place an order or create an account will appear here.'}</p>
          </section>
        ) : (
          <section className={styles.tableWrap} aria-label="Customers">
            <table className={styles.table}>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Phone</th><th>Account</th><th>Orders</th><th>Last order</th><th>Added</th><th /></tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const lastOrder = customer.orders[0]
                  return (
                    <tr key={customer.id}>
                      <td><Link className={styles.nameLink} href={`/admin/users/${customer.id}`}>{customer.fullName || 'Name not provided'}</Link></td>
                      <td><a href={`mailto:${customer.email}`}>{customer.email}</a></td>
                      <td>{customer.phone || '—'}</td>
                      <td>{customer.passwordHash ? 'Active' : 'Password setup needed'}</td>
                      <td>{customer._count.orders}</td>
                      <td>{lastOrder ? lastOrder.createdAt.toLocaleDateString('en-ZA') : '—'}</td>
                      <td>{customer.createdAt.toLocaleDateString('en-ZA')}</td>
                      <td><Link className={styles.viewLink} href={`/admin/users/${customer.id}`}>View orders <span aria-hidden="true">→</span></Link></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  )
}
