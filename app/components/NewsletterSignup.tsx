'use client'

import { useState, type FormEvent } from 'react'
import styles from './NewsletterSignup.module.css'

export default function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    setError(false)
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consent, website: '' }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'We could not save your subscription.')
      setMessage(result.message || 'You’re subscribed.')
      setEmail('')
      setConsent(false)
    } catch (cause) {
      setError(true)
      setMessage(cause instanceof Error ? cause.message : 'We could not save your subscription. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={styles.section} aria-labelledby="newsletter-title">
      <div className={styles.copy}>
        <span className={styles.kicker}>SUNDER NEWSLETTER</span>
        <h2 id="newsletter-title">Good tech. <em>Good specials.</em></h2>
        <p>Get new arrivals, limited-stock deals and Sunder specials in your inbox.</p>
      </div>
      <form className={styles.form} onSubmit={subscribe}>
        <label className={styles.visuallyHidden} htmlFor="newsletter-email">Email address</label>
        <div className={styles.controls}>
          <input id="newsletter-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" />
          <button type="submit" disabled={submitting || !consent}>{submitting ? 'Subscribing…' : 'Subscribe'}</button>
        </div>
        <label className={styles.consent}><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I agree to receive Sunder product updates and special offers by email.</span></label>
        <label className={styles.honeypot} aria-hidden="true">Leave this field empty<input tabIndex={-1} autoComplete="off" name="website" /></label>
        {message && <p className={error ? styles.error : styles.success} role="status">{message}</p>}
      </form>
    </section>
  )
}
