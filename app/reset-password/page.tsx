import Link from 'next/link'
import { SetCustomerPasswordForm } from '@/app/components/CustomerAccountForms'

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams

  return (
    <main className="simple-page account-page">
      <Link href="/">← Back to Sunder</Link>
      <h1>Set your password</h1>
      {token ? (
        <>
          <p>Choose a password to finish setting up your Sunder account.</p>
          <SetCustomerPasswordForm token={token} />
        </>
      ) : (
        <>
          <p>This password setup link is missing or invalid. Request a new link to continue.</p>
          <Link href="/register">Request a new password setup link</Link>
        </>
      )}
    </main>
  )
}
