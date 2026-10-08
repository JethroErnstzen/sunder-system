'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import styles from './SiteHeader.module.css'
import mobileStyles from './SiteHeaderMobile.module.css'

function UserIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M4.8 20c.8-4 3.2-6 7.2-6s6.4 2 7.2 6"/></svg>}
function CartIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.1 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.5L20.5 8H6"/><circle cx="9" cy="20" r="1.2"/><circle cx="17" cy="20" r="1.2"/></svg>}

export default function SiteHeader(){
 const [count,setCount]=useState(0)
 const [menuOpen,setMenuOpen]=useState(false)
 useEffect(()=>{const update=()=>{try{const cart=JSON.parse(localStorage.getItem('sunder-cart')||'[]');setCount(cart.reduce((sum:number,item:{quantity?:number})=>sum+Number(item.quantity||0),0))}catch{setCount(0)}};update();window.addEventListener('storage',update);window.addEventListener('sunder-cart-updated',update);return()=>{window.removeEventListener('storage',update);window.removeEventListener('sunder-cart-updated',update)}},[])
 return <header className={styles.header}>
  <div className={styles.announcement}><span><b>FREE Nationwide Shipping</b></span><i/><span>Warranty on all sales</span><i/><span>Bellville · Cape Town</span></div>
  <nav className={styles.nav} aria-label="Main navigation">
   <Link href="/" className={styles.logo}><Image src="/sunder-logo-white.png" alt="Sunder Computers" width={170} height={52} priority/></Link>
    <div className={`${styles.links} ${mobileStyles.desktopLinks}`}>
    <Link href="/shop">Shop</Link><Link href="/shop?onSale=true">On Sale</Link><Link href="/services">Services</Link><Link href="/contact">Contact</Link><Link href="/about-us">About Us</Link>
   </div>
   <div className={styles.actions}>
    <Link href="/account" className={styles.iconButton} aria-label="Account"><UserIcon/><span>Account</span></Link>
    <Link href="/checkout" className={styles.iconButton} aria-label="Cart"><CartIcon/><span>Cart</span><b>{count}</b></Link>
    <button type="button" className={mobileStyles.menuButton} aria-expanded={menuOpen} aria-controls="mobile-main-links" onClick={()=>setMenuOpen(open=>!open)}>
        <span aria-hidden="true" />Menu
    </button>
   </div>
   <div id="mobile-main-links" className={`${mobileStyles.mobileLinks} ${menuOpen ? mobileStyles.mobileLinksOpen : ''}`}>
    <Link href="/shop" onClick={()=>setMenuOpen(false)}>Shop</Link>
    <Link href="/shop?onSale=true" onClick={()=>setMenuOpen(false)}>On Sale</Link>
    <Link href="/services" onClick={()=>setMenuOpen(false)}>Services</Link>
    <Link href="/contact" onClick={()=>setMenuOpen(false)}>Contact</Link>
    <Link href="/about-us" onClick={()=>setMenuOpen(false)}>About Us</Link>
   </div>
  </nav>
 </header>
}
