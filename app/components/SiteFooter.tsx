import Link from 'next/link'
import Image from 'next/image'
import ContactIcon from './ContactIcon'
import styles from './SiteFooter.module.css'

export default function SiteFooter(){return <footer className={styles.footer}>
 <div className={styles.inner}>
  <div className={styles.about}>
    <Link href="/" className={styles.logo}><Image src="/sunder-logo-white.png" alt="Sunder Computers" width={190} height={49} /></Link>
   <p>Family owned and operated for the past 10 years, we’ve built a reputation for providing 5-star laptops and outstanding service.</p>
    <nav aria-label="Footer links" style={{ display: 'flex', marginTop: 17 }}>
     <Link href="/warranty" style={{ color: '#63eaff', fontSize: 14, fontWeight: 800 }}>Warranty &amp; Returns Policy</Link>
    </nav>
  </div>
  <div className={styles.contact}>
    <a href="https://api.whatsapp.com/send?phone=27610571714"><span className={styles.icon}><ContactIcon name="whatsapp" /></span><span>+27 61 057 1714</span><b>WhatsApp</b></a>
    <a href="mailto:sales@sunder.co.za"><span className={styles.icon}><ContactIcon name="email" /></span><span>sales@sunder.co.za</span><b>Email</b></a>
    <a href="tel:+27218920054"><span className={styles.icon}><ContactIcon name="phone" /></span><span>+27 21 892 0054</span><b>Phone</b></a>
    <div className={styles.address}><span className={styles.icon}><ContactIcon name="location" /></span><span>Delphi Arena, Bellville, Cape Town</span></div>
  </div>
 </div>
 <div className={styles.bottom}><span>© {new Date().getFullYear()} Sunder Computers</span><span>New · Demo · Pre-Owned · Refurbished</span></div>
 </footer>}
