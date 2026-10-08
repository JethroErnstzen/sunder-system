'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './AddToCartButton.module.css'

type Props = { product: { stockNumber:string; name:string; sellingPrice:number; listedPrice?:number; condition:string; imageUrl?:string|null } }

export default function AddToCartButton({ product }: Props) {
  const router = useRouter()
  const [added,setAdded] = useState(false)
  const isLaptop = /laptop|macbook|notebook|alienware|latitude|thinkpad|thinkbook|ideapad|elitebook|probook|precision|zenbook|vivobook|inspiron|vostro|xps|pavilion|spectre|omen|legion|yoga|chromebook/i.test(product.name)
  function addToCart(){
    const existing = JSON.parse(localStorage.getItem('sunder-cart') || '[]')
    const index = existing.findIndex((item:any)=>item.stockNumber===product.stockNumber)
    const cartItem = {...product,image:product.imageUrl || null,isLaptop}
    if(index>=0) existing[index].quantity += 1
    else existing.push({...cartItem,quantity:1})
    localStorage.setItem('sunder-cart',JSON.stringify(existing))
    window.dispatchEvent(new Event('sunder-cart-updated'))
    setAdded(true)
  }
  function buyNow(){ addToCart(); router.push('/checkout') }
  return <div className={styles.actions}>
    <button type="button" className={`${styles.button} ${styles.add}`} onClick={addToCart}>{added?'Added to cart':'Add to cart'}</button>
    <button type="button" className={`${styles.button} ${styles.buy}`} onClick={buyNow}>Buy now</button>
    {added && <a className={styles.checkout} href="/checkout">Cart updated — Checkout now →</a>}
  </div>
}
