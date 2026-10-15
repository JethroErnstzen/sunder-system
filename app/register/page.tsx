import Link from 'next/link'
import { CustomerSignupForm, PasswordSetupRequestForm } from '@/app/components/CustomerAccountForms'

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email = '' } = await searchParams
  if (email.trim()) {
    return (
      <main className="simple-page account-page">
        <Link href="/">← Back to Sunder</Link>
        <h1>Set up your account</h1>
        <p>Enter the email address used for your order and we will send a secure password setup link.</p>
        <PasswordSetupRequestForm initialEmail={email} />
        <p>Creating a new account? <Link href="/register">Sign up here</Link></p>
        <p>Already set up your password? <Link href="/login">Sign in</Link></p>
      </main>
    )
  }

  return (
    <main className="simple-page account-page">
      <Link href="/">← Back to Sunder</Link>
      <h1>Create your account</h1>
      <p>Save your contact and delivery details for a quicker checkout, and view your Sunder online order history.</p>
      <CustomerSignupForm />
      <p>Already have an account? <Link href="/login">Sign in</Link></p>
      <h2>Already shopped with Sunder?</h2>
      <p>If your account came from our previous website, request a secure password setup link using the email address from your purchases.</p>
      <PasswordSetupRequestForm initialEmail={email} />
    </main>
  )
}
