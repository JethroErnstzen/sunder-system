'use client'

import { useState } from 'react'

export default function SignOutButton() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function signOut() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/account/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Sign out failed.')
      window.location.assign('/login')
    } catch {
      setError('Unable to sign out. Please try again.')
      setBusy(false)
    }
  }

  return <div><button type="button" onClick={signOut} disabled={busy}>{busy ? 'Signing out…' : 'Sign out'}</button>{error && <p role="alert">{error}</p>}</div>
}
