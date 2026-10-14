'use client'

import { FormEvent, useEffect, useState } from 'react'
import styles from './coupons.module.css'

type Coupon = {
  id: string
  code: string
  discountType: 'percentage' | 'fixed'
  value: number
  minimumOrder: number | null
  maxUses: number | null
  usedCount: number
  startsAt: string | null
  expiresAt: string | null
  active: boolean
}

const money = (value: number) => `R ${value.toLocaleString('en-ZA')}`
const dateValue = (date: string | null) => date ? new Date(date).toLocaleDateString('en-ZA') : 'No limit'
const generatedCode = () => `SUNDER-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [code, setCode] = useState(generatedCode())
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [value, setValue] = useState('10')
  const [minimumOrder, setMinimumOrder] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const response = await fetch('/api/admin/coupons')
    const result = await response.json()
    if (response.ok) setCoupons(result)
    else setError(result.error || 'Unable to load discount codes.')
  }

  useEffect(() => { void load() }, [])

  async function createCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch('/api/admin/coupons', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, discountType, value, minimumOrder, maxUses, startsAt, expiresAt }),
      })
      const result = await response.json()
      if (!response.ok) { setError(result.error || 'Unable to create discount code.'); return }
      setMessage(`${result.code} is ready to use.`)
      setCode(generatedCode())
      await load()
    } catch { setError('Unable to create discount code.') }
    finally { setSaving(false) }
  }

  async function toggleCoupon(coupon: Coupon) {
    setError('')
    const response = await fetch('/api/admin/coupons', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: coupon.id, active: !coupon.active }),
    })
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Unable to update discount code.')
    else await load()
  }

  async function deleteCoupon(coupon: Coupon) {
    if (!window.confirm(`Delete ${coupon.code}? Past orders will keep the discount code in their history.`)) return
    setError('')
    const response = await fetch('/api/admin/coupons', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: coupon.id }),
    })
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Unable to delete discount code.')
    else await load()
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div><span className={styles.kicker}>SUNDER ADMIN</span><h1>Discount codes</h1><p>Create promotions and control when customers can use them.</p></div>
          <span className={styles.counter}>{coupons.length} {coupons.length === 1 ? 'code' : 'codes'}</span>
        </header>

        <div className={styles.columns}>
          <form className={styles.create} onSubmit={createCoupon}>
            <h2>Create a promotion</h2>
            <label>Discount code
              <div className={styles.codeInput}><input required value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={32} /><button type="button" onClick={() => setCode(generatedCode())}>Generate</button></div>
            </label>
            <div className={styles.row}>
              <label>Discount type<select value={discountType} onChange={(event) => setDiscountType(event.target.value as 'percentage' | 'fixed')}><option value="percentage">Percentage off</option><option value="fixed">Amount off</option></select></label>
              <label>{discountType === 'percentage' ? 'Percent' : 'Amount (R)'}<input type="number" min="0.01" step="0.01" max={discountType === 'percentage' ? 100 : undefined} required value={value} onChange={(event) => setValue(event.target.value)} /></label>
            </div>
            <div className={styles.row}>
              <label>Minimum products total (R)<input type="number" min="0" step="0.01" value={minimumOrder} onChange={(event) => setMinimumOrder(event.target.value)} placeholder="No minimum" /></label>
              <label>Maximum uses<input type="number" min="1" step="1" value={maxUses} onChange={(event) => setMaxUses(event.target.value)} placeholder="Unlimited" /></label>
            </div>
            <div className={styles.row}>
              <label>Starts on<input type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
              <label>Expires on<input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
            </div>
            {message && <p className={styles.success} role="status">{message}</p>}
            {error && <p className={styles.error} role="alert">{error}</p>}
            <button className={styles.submit} disabled={saving}>{saving ? 'Creating…' : 'Create discount code'}</button>
          </form>

          <section className={styles.list}>
            <h2>All discount codes</h2>
            {!coupons.length ? <p className={styles.empty}>No codes yet. Create a promotion to get started.</p> : coupons.map((coupon) => (
              <article className={styles.coupon} key={coupon.id}>
                <div className={styles.couponHead}><div><strong>{coupon.code}</strong><span className={coupon.active ? styles.active : styles.inactive}>{coupon.active ? 'Active' : 'Paused'}</span></div><b>{coupon.discountType === 'percentage' ? `${coupon.value}% off` : `${money(coupon.value)} off`}</b></div>
                <div className={styles.meta}>
                  <span>Used {coupon.usedCount}{coupon.maxUses ? ` / ${coupon.maxUses}` : ' times'}</span>
                  <span>{coupon.minimumOrder ? `Min. ${money(coupon.minimumOrder)}` : 'No minimum'}</span>
                  <span>{dateValue(coupon.startsAt)} – {dateValue(coupon.expiresAt)}</span>
                </div>
                <div className={styles.actions}><button type="button" onClick={() => void toggleCoupon(coupon)}>{coupon.active ? 'Pause code' : 'Activate code'}</button><button type="button" className={styles.delete} onClick={() => void deleteCoupon(coupon)}>Delete</button></div>
              </article>
            ))}
          </section>
        </div>
      </div>
    </main>
  )
}
