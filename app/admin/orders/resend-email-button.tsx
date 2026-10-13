'use client'

import { useState } from 'react'
import styles from './orders.module.css'

export default function ResendOrderEmailsButton({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)

  async function resend() {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/resend-email`, { method: 'POST' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Emails could not be sent.')
      setFailed(false)
      setMessage(result.message || 'Emails sent.')
    } catch (error) {
      setFailed(true)
      setMessage(error instanceof Error ? error.message : 'Emails could not be sent.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.emailActions}>
      <button className={styles.resendButton} type="button" onClick={resend} disabled={busy}>
        {busy ? 'Sending…' : 'Resend invoice and sales alert'}
      </button>
      {message && <span className={failed ? styles.emailFailure : styles.emailSuccess} role="status">{message}</span>}
    </div>
  )
}
