'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import styles from './CustomerAccountForms.module.css'

export function CustomerLoginForm() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const form = new FormData(event.currentTarget)
      const response = await fetch('/api/account/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Unable to sign in. Please try again.')
        return
      }
      window.location.assign('/account')
    } catch {
      setError('Unable to sign in right now. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label>Email address<input type="email" name="email" autoComplete="email" required maxLength={254} /></label>
      <label>Password<input type="password" name="password" autoComplete="current-password" required /></label>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      <p className={styles.note}>First time on our new website? <Link href="/register">Email me a password setup link</Link></p>
    </form>
  )
}

export function PasswordSetupRequestForm({ initialEmail = '' }: { initialEmail?: string }) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const form = new FormData(event.currentTarget)
      const response = await fetch('/api/account/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email') }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Unable to send a password setup link.')
        return
      }
      setMessage(result.message)
    } catch {
      setError('Unable to send a password setup link right now. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label>Email address<input type="email" name="email" autoComplete="email" defaultValue={initialEmail} required maxLength={254} /></label>
      {message && <p className={styles.success} role="status">{message}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Email my password setup link'}</button>
    </form>
  )
}

export function SetCustomerPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') || '')
    if (password !== String(form.get('confirmPassword') || '')) {
      setError('The passwords do not match.')
      return
    }

    setBusy(true)
    try {
      const response = await fetch('/api/account/password-reset/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'This password setup link cannot be used.')
        return
      }
      window.location.assign('/account')
    } catch {
      setError('Unable to set your password right now. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label>New password<input type="password" name="password" autoComplete="new-password" minLength={8} maxLength={200} pattern="(?=.*[A-Z]).{8,}" title="Use at least 8 characters and include one capital letter." required /></label>
      <label>Confirm new password<input type="password" name="confirmPassword" autoComplete="new-password" minLength={8} maxLength={200} pattern="(?=.*[A-Z]).{8,}" title="Use at least 8 characters and include one capital letter." required /></label>
      <p className={styles.note}>Use at least 8 characters and include one capital letter.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Set password'}</button>
    </form>
  )
}
