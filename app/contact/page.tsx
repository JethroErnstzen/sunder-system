'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import styles from './contact.module.css'

const shopPhotos = [
  { src: 'https://www.sunder.co.za/wp-content/uploads/2025/07/Sunder-Computers-4-1.png', alt: 'Sunder Computers store' },
  { src: 'https://www.sunder.co.za/wp-content/uploads/2025/07/Sunder-Computers-1-1.png', alt: 'Sunder Computers showroom' },
  { src: 'https://www.sunder.co.za/wp-content/uploads/2025/07/Sunder-Computers-2-1.png', alt: 'Sunder Computers store interior' },
  { src: 'https://www.sunder.co.za/wp-content/uploads/2025/07/Sunder-Computers-5-1.png', alt: 'Sunder Computers shop' },
]

export default function ContactPage() {
  const [sent, setSent] = useState(false)

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '')
    const contact = String(form.get('contact') || '')
    const message = String(form.get('message') || '')
    const text = `Hi Sunder Computers, I would like to enquire.%0A%0AName: ${encodeURIComponent(name)}%0AContact: ${encodeURIComponent(contact)}%0A%0AMessage:%0A${encodeURIComponent(message)}`
    setSent(true)
    window.open(`https://wa.me/27610571714?text=${text}`, '_blank', 'noopener,noreferrer')
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
          <div className={styles.heroCard}>
            <strong>Visit our store</strong>
            <span>Delphi Arena, Shop 6 (Pillar Shop)</span>
            <span>1 Old Oak Road, Kenridge</span>
            <span>Bellville, Cape Town, 7550</span>
            <a href="https://www.google.com/maps/search/?api=1&query=Delphi+Arena+1+Old+Oak+Road+Kenridge+Cape+Town+7550" target="_blank" rel="noreferrer">Get directions →</a>
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

        <form className={styles.form} onSubmit={submitMessage}>
          <p className={styles.eyebrow}>SEND A MESSAGE</p>
          <h2>Tell us what you need.</h2>
          <label>Name<input name="name" required placeholder="Your name" /></label>
          <label>Phone or email<input name="contact" required placeholder="How can we reach you?" /></label>
          <label>Message<textarea name="message" required rows={6} placeholder="Tell us what you're looking for, which product you're interested in, or how we can help..." /></label>
          <button type="submit">Send via WhatsApp →</button>
          {sent && <p className={styles.sent}>Your message is ready in WhatsApp. Send it there to reach our team.</p>}
          <small>Prefer email? <a href="mailto:sales@sunder.co.za">sales@sunder.co.za</a></small>
        </form>
      </section>

      <section className={styles.locationSection}>
        <div className={styles.wrap}>
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>FIND US</p><h2>Our store in Bellville.</h2><p>Visit us at Delphi Arena in Kenridge, opposite Tyger Valley Mall.</p></div><a href="https://www.google.com/maps/search/?api=1&query=Delphi+Arena+1+Old+Oak+Road+Kenridge+Cape+Town+7550" target="_blank" rel="noreferrer" className={styles.secondary}>Open in Google Maps</a></div>
          <div className={styles.mapWrap}><iframe title="Sunder Computers location" src="https://www.google.com/maps?q=Delphi%20Arena%2C%201%20Old%20Oak%20Road%2C%20Kenridge%2C%20Cape%20Town%2C%207550&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div>
        </div>
      </section>

      <section className={styles.wrap + ' ' + styles.photosSection}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>VISIT SUNDER</p><h2>See the store for yourself.</h2><p>Real products, a real showroom and a team ready to help.</p></div><Link href="/shop" className={styles.secondary}>Browse our products</Link></div>
      </section>

      <section className={styles.finalCta}><div className={styles.wrap}><div><p className={styles.eyebrow}>NEED HELP CHOOSING?</p><h2>Not sure which laptop is right for you?</h2><p>Use our Help Me Choose guide and we'll narrow the options down based on how you actually work.</p></div><Link href="/help-me-choose" className={styles.primary}>Help me choose →</Link></div></section>
    </main>
  )
}
