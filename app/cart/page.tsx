'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import styles from './cart.module.css'
import { trackAnalytics } from '@/lib/analytics-client'

type CartItem = {
  stockNumber: string
  name: string
  sellingPrice: number
  listedPrice?: number
  condition: string
  category?: string
  imageUrl?: string | null
  quantity: number
  availableQuantity?: number
}

const money = (value: number) => `R ${value.toLocaleString('en-ZA')}`

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sunder-cart') || '[]')
      const uniqueItems = new Map<string, CartItem>()
      if (Array.isArray(saved)) {
        for (const item of saved as CartItem[]) {
          if (item && typeof item.stockNumber === 'string') {
            const available = Math.max(1, Number(item.availableQuantity) || Number(item.quantity) || 1)
            uniqueItems.set(item.stockNumber, { ...item, availableQuantity: available, quantity: Math.max(1, Math.min(available, Number(item.quantity) || 1)) })
          }
        }
      }
      const normalized = [...uniqueItems.values()]
      setItems(normalized)
      localStorage.setItem('sunder-cart', JSON.stringify(normalized))
      trackAnalytics({ eventType: 'cart_view', quantity: normalized.reduce((sum, item) => sum + item.quantity, 0) })
      normalized.forEach(item => trackAnalytics({ eventType: 'cart_item_view', productStockNumber: item.stockNumber, quantity: item.quantity }))
    } catch {
      setItems([])
      localStorage.removeItem('sunder-cart')
    }
  }, [])

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0),
    [items]
  )

  function save(next: CartItem[]) {
    setItems(next)
    localStorage.setItem('sunder-cart', JSON.stringify(next))
    window.dispatchEvent(new Event('sunder-cart-updated'))
  }

  function remove(stockNumber: string) {
    trackAnalytics({ eventType: 'remove_from_cart', productStockNumber: stockNumber, quantity: 0 })
    save(items.filter(item => item.stockNumber !== stockNumber))
  }

  function changeQty(stockNumber: string, quantity: number) {
    const next = Math.max(1, Math.min(items.find(item => item.stockNumber === stockNumber)?.availableQuantity || 99, quantity))
    trackAnalytics({ eventType: 'cart_quantity', productStockNumber: stockNumber, quantity: next })
    save(items.map(item => item.stockNumber === stockNumber ? { ...item, quantity: next } : item))
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>SUNDER COMPUTERS</span>
            <h1>Your Cart</h1>
            <p>{items.length ? `${items.length} ${items.length === 1 ? 'product' : 'products'} in your cart` : 'Your cart is currently empty'}</p>
          </div>
          <div className={styles.trust}>
            <strong>FREE Nationwide Shipping</strong>
            <span>All prices incl. VAT</span>
          </div>
        </header>

        {items.length === 0 ? (
          <section className={styles.empty}>
            <div className={styles.emptyMark}>+</div>
            <h2>Your cart is empty</h2>
            <p>Browse our latest laptops and computers and add something to your cart.</p>
            <Link href="/shop" className={styles.primary}>Continue Shopping</Link>
          </section>
        ) : (
          <div className={styles.layout}>
            <section className={styles.items}>
              {items.map(item => (
                <article className={styles.item} key={item.stockNumber}>
                  <Link href={`/shop/${item.stockNumber}`} className={styles.image} aria-label={`View ${item.name}`}>
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <span>SUNDER</span>}
                  </Link>

                  <div className={styles.product}>
                    <div className={styles.condition}>{item.condition}</div>
                    <Link href={`/shop/${item.stockNumber}`} className={styles.name}>{item.name}</Link>
                    <div className={styles.stock}>Stock No. {item.stockNumber}</div>
                    <div className={styles.unitPrice}>{item.listedPrice && item.listedPrice > item.sellingPrice && <><s>{money(item.listedPrice)}</s> </>}{money(item.sellingPrice)} <span>incl. VAT</span></div>
                  </div>

                  <div className={styles.actions}>
                    <div className={styles.quantity}>
                      <button onClick={() => changeQty(item.stockNumber, item.quantity - 1)} aria-label="Decrease quantity">−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => changeQty(item.stockNumber, item.quantity + 1)} aria-label="Increase quantity" disabled={item.quantity >= (item.availableQuantity || 99)}>+</button>
                    </div>
                    <strong className={styles.lineTotal}>{money(item.sellingPrice * item.quantity)}</strong>
                    <button className={styles.remove} onClick={() => remove(item.stockNumber)}>Remove</button>
                  </div>
                </article>
              ))}

              <div className={styles.bottomLinks}>
                <Link href="/shop">← Continue Shopping</Link>
                <span>FREE Nationwide Shipping</span>
              </div>
            </section>

            <aside className={styles.summary}>
              <div className={styles.summaryTop}>
                <span>ORDER SUMMARY</span>
                <strong>{items.length} {items.length === 1 ? 'item' : 'items'}</strong>
              </div>
              <div className={styles.summaryRow}><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
              <div className={styles.summaryRow}><span>Shipping</span><strong className={styles.free}>FREE</strong></div>
              <div className={styles.vatNote}>All prices are VAT inclusive.</div>
              <div className={styles.total}><span>Total</span><strong>{money(subtotal)}</strong></div>
              <Link href="/checkout" className={`${styles.primary} ${styles.checkoutButton}`}>Proceed to Checkout <span>→</span></Link>
              <div className={styles.benefits}>
                <div><strong>FREE Nationwide Shipping</strong><span>Delivery included</span></div>
                <div><strong>Warranty included</strong><span>On qualifying products</span></div>
                <div><strong>Physical store</strong><span>Bellville, Cape Town</span></div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}
