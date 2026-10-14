'use client'

import Link from 'next/link'
import Image from 'next/image'
import { FormEvent, useState } from 'react'
import styles from './contact.module.css'

export default function ContactPage() {
  const [sent, setSent] = useState('')
  const [contactError, setContactError] = useState('')

  function readMessage(formElement: HTMLFormElement) {
    if (!formElement.reportValidity()) return null
    const form = new FormData(formElement)
    const name = String(form.get('name') || '').trim()
    const contact = String(form.get('contact') || '').trim()
    const message = String(form.get('message') || '').trim()
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)
    const compactPhone = contact.replace(/[\s().-]/g, '')
    const isPhone = /^(?:0\d{9}|\+?27\d{9})$/.test(compactPhone)
    if (!isEmail && !isPhone) {
      setContactError('Enter a valid email address or a South African phone number with 10 digits, such as 082 123 4567.')
      return null
    }
    setContactError('')
    return { name, contact, message }
  }

  function sendWhatsApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const details = readMessage(event.currentTarget)
    if (!details) return
    const text = `Hi Sunder Computers, I would like to enquire.\n\nName: ${details.name}\nReply to: ${details.contact}\n\nMessage:\n${details.message}`
    window.open(`https://wa.me/27610571714?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
    setSent('WhatsApp opened with your message. Review it and tap Send to contact us.')
  }

  function sendEmail() {
    const form = document.getElementById('contact-message-form') as HTMLFormElement | null
    if (!form) return
    const details = readMessage(form)
    if (!details) return
    const subject = `Website enquiry from ${details.name}`
    const body = `Name: ${details.name}\nReply to: ${details.contact}\n\nMessage:\n${details.message}`
    window.location.href = `mailto:sales@sunder.co.za?${new URLSearchParams({ subject, body }).toString()}`
    setSent('Your email app is opening with the message ready to send to sales@sunder.co.za.')
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.wrap}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>CONTACT SUNDER COMPUTERS</p>
            <h1>Come in, call us or <em>send us a message.</em></h1>
            <p>Whether you know exactly what you need or want help choosing a laptop, our team is here to help.</p>
            <div className={styles.heroActions}>
              <a href="https://wa.me/27610571714" target="_blank" rel="noreferrer" className={styles.primary}>WhatsApp us</a>
              <a href="tel:+27218920054" className={styles.secondary}>Call the store</a>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.heroPhoto}>
              <Image src="/sunder-store-hero.jpg" alt="Inside the Sunder Computers showroom, with laptops on display" fill priority sizes="(max-width:850px) 100vw, 45vw" />
              <span>Our showroom in Bellville</span>
            </div>
            <div className={styles.heroCard}>
              <strong>Visit our store</strong>
              <span>Delphi Arena, Shop 6 (Pillar Shop)</span>
              <span>1 Old Oak Road, Kenridge</span>
              <span>Bellville, Cape Town, 7550</span>
              <a href="https://www.google.com/maps/search/?api=1&query=Delphi+Arena+1+Old+Oak+Road+Kenridge+Cape+Town+7550" target="_blank" rel="noreferrer">Get directions →</a>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.wrap + ' ' + styles.contactGrid}>
        <div className={styles.infoColumn}>
          <p className={styles.eyebrow}>GET IN TOUCH</p>
          <h2>We'd love to hear from you.</h2>
          <p className={styles.intro}>Send us your requirements and we'll help you find the right product, answer questions about a listing, or assist with an existing purchase.</p>

          <div className={styles.contactCards}>
            <a href="https://wa.me/27610571714" target="_blank" rel="noreferrer" className={styles.contactCard}>
              <span className={styles.icon}>WA</span><div><strong>WhatsApp</strong><span>+27 61 057 1714</span></div>
            </a>
            <a href="mailto:sales@sunder.co.za" className={styles.contactCard}>
              <span className={styles.icon}>@</span><div><strong>Email</strong><span>sales@sunder.co.za</span></div>
            </a>
            <a href="tel:+27218920054" className={styles.contactCard}>
              <span className={styles.icon}>TEL</span><div><strong>Phone</strong><span>+27 21 892 0054</span></div>
            </a>
          </div>

          <div className={styles.hours}>
            <h3>Store hours</h3>
            <div><span>Monday – Friday</span><strong>09:00 – 17:00</strong></div>
            <div><span>Saturday</span><strong>09:00 – 12:00</strong></div>
            <div><span>Sunday</span><strong>Closed</strong></div>
          </div>
        </div>

        <form id="contact-message-form" className={styles.form} onSubmit={sendWhatsApp}>
          <p className={styles.eyebrow}>SEND A MESSAGE</p>
          <h2>Tell us what you need.</h2>
          <label>Name<input name="name" required placeholder="Your name" /></label>
          <label>Phone number or email<input name="contact" type="text" required placeholder="e.g. 082 123 4567 or you@example.com" onChange={() => { setContactError(''); setSent('') }} /></label>
          <small className={styles.fieldHint}>Enter a valid email address or a South African phone number. We’ll use it to reply.</small>
          <label>Message<textarea name="message" required rows={6} placeholder="Tell us what you're looking for, which product you're interested in, or how we can help..." /></label>
          {contactError && <p className={styles.error} role="alert">{contactError}</p>}
          <div className={styles.sendActions}>
            <button type="submit">Send via WhatsApp <span aria-hidden="true">↗</span></button>
            <button type="button" className={styles.emailButton} onClick={sendEmail}>Send via email <span aria-hidden="true">↗</span></button>
          </div>
          {sent && <p className={styles.sent} role="status">{sent}</p>}
          <small>Your chosen app opens with the message ready. Review it and tap Send.</small>
        </form>
      </section>

      <section className={styles.locationSection}>
        <div className={styles.wrap}>
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>FIND US</p><h2>Our store in Bellville.</h2><p>Visit us at Delphi Arena in Kenridge, opposite Tyger Valley Mall.</p></div><a href="https://www.google.com/maps/search/?api=1&query=Delphi+Arena+1+Old+Oak+Road+Kenridge+Cape+Town+7550" target="_blank" rel="noreferrer" className={styles.secondary}>Open in Google Maps</a></div>
          <div className={styles.mapWrap}><iframe title="Sunder Computers location" src="https://www.google.com/maps?q=Delphi%20Arena%2C%201%20Old%20Oak%20Road%2C%20Kenridge%2C%20Cape%20Town%2C%207550&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div>
        </div>
      </section>

      <section className={styles.finalCta}><div className={styles.wrap}><div><p className={styles.eyebrow}>NEED HELP CHOOSING?</p><h2>Not sure which laptop is right for you?</h2><p>Use our Help Me Choose guide and we'll narrow the options down based on how you actually work.</p></div><Link href="/help-me-choose" className={styles.primary}>Help me choose →</Link></div></section>
    </main>
  )
}
