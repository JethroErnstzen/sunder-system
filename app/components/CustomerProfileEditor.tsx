'use client'

import { FormEvent, useState } from 'react'
import styles from './CustomerProfileEditor.module.css'

export type EditableCustomerAddress = {
  id?: string
  label: string
  recipientName: string
  phone: string
  addressLine1: string
  suburb: string
  city: string
  province: string
  postalCode: string
  isDefault: boolean
}

export type EditableCustomerProfile = {
  email: string
  fullName: string
  phone: string
  addresses: EditableCustomerAddress[]
}

const newAddress = (fullName: string, phone: string): EditableCustomerAddress => ({
  label: 'Home',
  recipientName: fullName,
  phone,
  addressLine1: '',
  suburb: '',
  city: '',
  province: '',
  postalCode: '',
  isDefault: false,
})

export default function CustomerProfileEditor({ profile }: { profile: EditableCustomerProfile }) {
  const [fullName, setFullName] = useState(profile.fullName)
  const [phone, setPhone] = useState(profile.phone)
  const [addresses, setAddresses] = useState(profile.addresses)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  function updateAddress(index: number, field: keyof EditableCustomerAddress, value: string | boolean) {
    setAddresses((current) => current.map((address, addressIndex) => {
      if (addressIndex !== index) return address
      return { ...address, [field]: value }
    }))
    setSaved(false)
  }

  function chooseDefault(index: number) {
    setAddresses((current) => current.map((address, addressIndex) => ({ ...address, isDefault: addressIndex === index })))
    setSaved(false)
  }

  function removeAddress(index: number) {
    setAddresses((current) => {
      const next = current.filter((_, addressIndex) => addressIndex !== index)
      if (next.length && !next.some((address) => address.isDefault)) {
        return next.map((address, addressIndex) => ({ ...address, isDefault: addressIndex === 0 }))
      }
      return next
    })
    setSaved(false)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone, addresses }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Unable to save your account details.')
        return
      }
      if (Array.isArray(result.addresses)) setAddresses(result.addresses)
      setSaved(true)
    } catch {
      setError('Unable to save your account details right now. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className={styles.panel}>
      <summary className={styles.panelSummary}>
      <div className={styles.heading}>
        <div><span>ACCOUNT DETAILS</span><h2>Your details</h2></div>
        <p>Your email address is used for sign-in and order history, so it can’t be changed here.</p>
      </div>
        <span className={styles.toggle}><span className={styles.editLabel}>Edit details</span><span className={styles.closeLabel}>Close</span><span aria-hidden="true">⌄</span></span>
      </summary>
      <form onSubmit={submit}>
        <div className={styles.personalGrid}>
          <label>Full name<input autoComplete="name" value={fullName} onChange={(event) => { setFullName(event.target.value); setSaved(false) }} required minLength={2} maxLength={120} /></label>
          <label>Mobile number<input type="tel" autoComplete="tel" value={phone} onChange={(event) => { setPhone(event.target.value); setSaved(false) }} required minLength={7} maxLength={30} /></label>
          <label className={styles.emailField}>Email address<input type="email" value={profile.email} readOnly aria-describedby="account-email-note" /></label>
        </div>
        <p id="account-email-note" className={styles.emailNote}>Contact Sunder Computers if you need to change your email address.</p>

        <div className={styles.addressHeading}>
          <div><span>DELIVERY DETAILS</span><h3>Saved addresses</h3></div>
          <button type="button" className={styles.secondaryButton} onClick={() => { setAddresses((current) => { const address = newAddress(fullName, phone); if (current.length === 0) address.isDefault = true; return [...current, address] }); setSaved(false) }}>Add address</button>
        </div>

        {addresses.length === 0 ? <p className={styles.empty}>Add at least one address to save your account details.</p> : (
          <div className={styles.addressList}>
            {addresses.map((address, index) => (
              <fieldset className={styles.address} key={address.id || `new-${index}`}>
                <legend>{address.label || `Address ${index + 1}`}</legend>
                <div className={styles.addressGrid}>
                  <label>Address name<input value={address.label} onChange={(event) => updateAddress(index, 'label', event.target.value)} required maxLength={40} /></label>
                  <label>Recipient name<input autoComplete="name" value={address.recipientName} onChange={(event) => updateAddress(index, 'recipientName', event.target.value)} required minLength={2} maxLength={120} /></label>
                  <label>Mobile number<input type="tel" autoComplete="tel" value={address.phone} onChange={(event) => updateAddress(index, 'phone', event.target.value)} required minLength={7} maxLength={30} /></label>
                  <label className={styles.wide}>Street address<input autoComplete="address-line1" value={address.addressLine1} onChange={(event) => updateAddress(index, 'addressLine1', event.target.value)} required minLength={3} maxLength={200} /></label>
                  <label>Suburb<input autoComplete="address-level3" value={address.suburb} onChange={(event) => updateAddress(index, 'suburb', event.target.value)} required minLength={2} maxLength={100} /></label>
                  <label>City<input autoComplete="address-level2" value={address.city} onChange={(event) => updateAddress(index, 'city', event.target.value)} required minLength={2} maxLength={100} /></label>
                  <label>Province<input autoComplete="address-level1" value={address.province} onChange={(event) => updateAddress(index, 'province', event.target.value)} required minLength={2} maxLength={100} /></label>
                  <label>Postal code<input autoComplete="postal-code" value={address.postalCode} onChange={(event) => updateAddress(index, 'postalCode', event.target.value)} required minLength={3} maxLength={20} /></label>
                </div>
                <div className={styles.addressActions}>
                  <label className={styles.defaultChoice}><input type="radio" name="defaultAddress" checked={address.isDefault} onChange={() => chooseDefault(index)} /> Default checkout address</label>
                  {addresses.length > 1 && <button type="button" className={styles.removeButton} onClick={() => removeAddress(index)}>Remove address</button>}
                </div>
              </fieldset>
            ))}
          </div>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}
        {saved && <p className={styles.success} role="status">Your details have been saved.</p>}
        <button className={styles.saveButton} type="submit" disabled={busy || addresses.length === 0}>{busy ? 'Saving…' : 'Save changes'}</button>
      </form>
    </details>
  )
}
