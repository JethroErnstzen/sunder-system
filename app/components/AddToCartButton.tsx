'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './AddToCartButton.module.css'
import { trackAnalytics } from '@/lib/analytics-client'

type Props = { product: { stockNumber:string; name:string; sellingPrice:number; listedPrice?:number; condition:string; imageUrl?:string|null; availableQuantity:number } }

export default function AddToCartButton({ product }: Props) {
  const router = useRouter()
  const [added,setAdded] = useState(false)
  const [quantity,setQuantity] = useState(1)
  const isLaptop = /laptop|macbook|notebook|alienware|latitude|thinkpad|thinkbook|ideapad|elitebook|probook|precision|zenbook|vivobook|inspiron|vostro|xps|pavilion|spectre|omen|legion|yoga|chromebook/i.test(product.name)
  function addToCart(){
    let existing:any[] = []
    try {
      const saved = JSON.parse(localStorage.getItem('sunder-cart') || '[]')
      existing = Array.isArray(saved) ? saved : []
    } catch {}
    existing = [...new Map(existing
      .filter((item:any)=>item && typeof item.stockNumber==='string')
      .map((item:any)=>[item.stockNumber,{...item,quantity:Math.max(1,Number(item.quantity)||1)}])).values()]
    const index = existing.findIndex((item:any)=>item.stockNumber===product.stockNumber)
    const cartItem = {...product,image:product.imageUrl || null,isLaptop}
    if(index>=0) existing[index] = {
      ...existing[index],
      ...cartItem,
      quantity: Math.min(product.availableQuantity, (Number(existing[index].quantity) || 0) + quantity),
    }
    else existing.push({...cartItem,quantity:Math.min(product.availableQuantity,quantity)})
    localStorage.setItem('sunder-cart',JSON.stringify(existing))
    window.dispatchEvent(new Event('sunder-cart-updated'))
    trackAnalytics({ eventType: 'add_to_cart', productStockNumber: product.stockNumber, quantity })
    setAdded(true)
  }
  function buyNow(){ addToCart(); router.push('/checkout') }
  return <div className={styles.actions}>
    <label className={styles.quantityLabel}>Quantity
      <input type="number" min={1} max={product.availableQuantity} value={quantity} onChange={(event) => {
        const next = Number(event.target.value)
        setQuantity(Math.max(1, Math.min(product.availableQuantity, Number.isFinite(next) ? next : 1)))
      }} />
      <span>{product.availableQuantity} in stock</span>
    </label>
    <button type="button" className={`${styles.button} ${styles.add}`} onClick={addToCart}>{added?'Added to cart':'Add to cart'}</button>
    <button type="button" className={`${styles.button} ${styles.buy}`} onClick={buyNow}>Buy now</button>
    {added && <a className={styles.checkout} href="/checkout">Cart updated — Checkout now →</a>}
  </div>
}
