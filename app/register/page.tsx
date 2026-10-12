import Link from 'next/link'
import { PasswordSetupRequestForm } from '@/app/components/CustomerAccountForms'

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email = '' } = await searchParams
  return (
    <main className="simple-page account-page">
      <Link href="/">← Back to Sunder</Link>
      <h1>Set up your account</h1>
      <p>We have moved to a new website, so existing customers need to set a new password. Enter the email address used for your Sunder purchases and we will send a secure setup link.</p>
      <PasswordSetupRequestForm initialEmail={email} />
      <p>Already set up your password? <Link href="/login">Sign in</Link></p>
    </main>
  )
}
