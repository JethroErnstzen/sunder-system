'use client'

import Link from 'next/link'
import { ChangeEvent, useState } from 'react'
import styles from './import.module.css'

type Preview = { eligible: number; invalid: number; duplicates: number; excludedRoles: number }
type ImportResult = { created: number; matched: number; profileDetailsAdded: number; invalid: number; duplicates: number; excludedRoles: number }

export default function CustomerImportForm() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] || null)
    setPreview(null)
    setResult(null)
    setError('')
  }

  async function submit(intent: 'preview' | 'import') {
    if (!file) {
      setError('Choose the customer CSV first.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const formData = new FormData()
      formData.set('file', file)
      formData.set('intent', intent)
      const response = await fetch('/api/admin/users/import', { method: 'POST', body: formData })
      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error || 'The CSV could not be processed.')
        return
      }
      if (intent === 'preview') setPreview(payload as Preview)
      else setResult(payload as ImportResult)
    } catch {
      setError('The CSV could not be processed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.instructions}>
        <h2>Choose a CSV file</h2>
        <p>Use a file with an Email column and, optionally, Name and Billing Phone. WordPress roles are filtered: only customers and subscribers are imported.</p>
        <p>Passwords are not copied. Imported customers can set a new password from the sign-in page. Existing site accounts and passwords are preserved.</p>
      </div>
      <label className={styles.fileLabel}>
        Customer CSV
        <input type="file" accept=".csv,text/csv" onChange={handleFileChange} disabled={busy || Boolean(result)} />
      </label>
      {file && <p className={styles.fileName}>Selected: {file.name} · {(file.size / 1024).toFixed(1)} KB</p>}
      <div className={styles.actions}>
        <button type="button" onClick={() => submit('preview')} disabled={!file || busy || Boolean(result)}>
          {busy ? 'Please wait…' : 'Preview import'}
        </button>
        {preview && !result && (
          <button className={styles.confirm} type="button" onClick={() => submit('import')} disabled={busy}>
            {busy ? 'Importing…' : `Import ${preview.eligible} accounts`}
          </button>
        )}
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {preview && !result && (
        <div className={styles.summary} role="status">
          <h3>Ready to import</h3>
          <p><strong>{preview.eligible}</strong> unique customer and subscriber accounts are ready.</p>
          {(preview.excludedRoles || preview.invalid || preview.duplicates) > 0 && (
            <p>Skipped: {preview.excludedRoles} other roles, {preview.invalid} invalid email addresses, {preview.duplicates} duplicate rows.</p>
          )}
        </div>
      )}
      {result && (
        <div className={styles.summary} role="status">
          <h3>Import complete</h3>
          <p><strong>{result.created}</strong> new accounts added. {result.matched} existing accounts matched; {result.profileDetailsAdded} had missing profile details filled in.</p>
          {(result.excludedRoles || result.invalid || result.duplicates) > 0 && (
            <p>Skipped: {result.excludedRoles} other roles, {result.invalid} invalid email addresses, {result.duplicates} duplicate rows.</p>
          )}
          <Link href="/admin/users">View customer accounts →</Link>
        </div>
      )}
    </section>
  )
}
