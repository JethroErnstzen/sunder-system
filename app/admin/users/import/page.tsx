import Link from 'next/link'
import CustomerImportForm from './customer-import-form'
import styles from '../users.module.css'

export const dynamic = 'force-dynamic'

export default function AdminUserImportPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.backLink} href="/admin/users">← All users</Link>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>SUNDER ADMIN</span>
            <h1>Import customers</h1>
            <p>Bring customer and subscriber accounts over from WordPress or WooCommerce.</p>
          </div>
        </header>
        <CustomerImportForm />
      </div>
    </main>
  )
}
