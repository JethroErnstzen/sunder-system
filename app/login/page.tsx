import Link from 'next/link'
import { CustomerLoginForm } from '@/app/components/CustomerAccountForms'

export default function LoginPage() {
  return (
    <main className="simple-page account-page">
      <Link href="/">← Back to Sunder</Link>
      <h1>Sign in</h1>
      <p>Access your Sunder account and order history.</p>
      <CustomerLoginForm />
      <p>Need help? <a href="mailto:sales@sunder.co.za">Contact Sunder Computers</a></p>
    </main>
  )
}
