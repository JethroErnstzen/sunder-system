'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type CartItem = {
  stockNumber: string
  name: string
  sellingPrice: number
  listedPrice?: number
  condition: string
  category?: string
  imageUrl?: string | null
  quantity: number
}

const money = (value: number) => `R ${value.toLocaleString('en-ZA')}`

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    setItems(JSON.parse(localStorage.getItem('sunder-cart') || '[]'))
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

  function changeQty(stockNumber: string, quantity: number) {
    if (quantity < 1) return remove(stockNumber)
    save(items.map(item => item.stockNumber === stockNumber ? { ...item, quantity } : item))
  }

  function remove(stockNumber: string) {
    save(items.filter(item => item.stockNumber !== stockNumber))
  }

  return (
    <main className="cart-v2-page">
      <div className="cart-v2-shell">
        <header className="cart-v2-header">
          <div>
            <span className="cart-v2-kicker">SUNDER COMPUTERS</span>
            <h1>Your Cart</h1>
            <p>{items.length ? `${items.length} ${items.length === 1 ? 'product' : 'products'} in your cart` : 'Your cart is currently empty'}</p>
          </div>
          <div className="cart-v2-trust">
            <strong>FREE Nationwide Shipping</strong>
            <span>All prices incl. VAT</span>
          </div>
        </header>

        {items.length === 0 ? (
          <section className="cart-v2-empty">
            <div className="cart-empty-mark">+</div>
            <h2>Your cart is empty</h2>
            <p>Browse our latest laptops and computers and add something to your cart.</p>
            <Link href="/shop" className="cart-v2-primary">Continue Shopping</Link>
          </section>
        ) : (
          <div className="cart-v2-layout">
            <section className="cart-v2-items">
              {items.map(item => (
                <article className="cart-v2-item" key={item.stockNumber}>
                  <Link href={`/shop/${item.stockNumber}`} className="cart-v2-image" aria-label={`View ${item.name}`}>
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <span>SUNDER</span>}
                  </Link>

                  <div className="cart-v2-product">
                    <div className="cart-v2-condition">{item.condition}</div>
                    <Link href={`/shop/${item.stockNumber}`} className="cart-v2-name">{item.name}</Link>
                    <div className="cart-v2-stock">Stock No. {item.stockNumber}</div>
                    <div className="cart-v2-unit-price">{item.listedPrice && item.listedPrice > item.sellingPrice && <><s>{money(item.listedPrice)}</s> </>}{money(item.sellingPrice)} <span>incl. VAT</span></div>
                  </div>

                  <div className="cart-v2-actions">
                    <div className="cart-v2-quantity">
                      <button onClick={() => changeQty(item.stockNumber, item.quantity - 1)} aria-label="Decrease quantity">−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => changeQty(item.stockNumber, item.quantity + 1)} aria-label="Increase quantity">+</button>
                    </div>
                    <strong className="cart-v2-line-total">{money(item.sellingPrice * item.quantity)}</strong>
                    <button className="cart-v2-remove" onClick={() => remove(item.stockNumber)}>Remove</button>
                  </div>
                </article>
              ))}

              <div className="cart-v2-bottom-links">
                <Link href="/shop">← Continue Shopping</Link>
                <span>FREE Nationwide Shipping</span>
              </div>
            </section>

            <aside className="cart-v2-summary">
              <div className="cart-summary-top">
                <span>ORDER SUMMARY</span>
                <strong>{items.length} {items.length === 1 ? 'item' : 'items'}</strong>
              </div>
              <div className="cart-summary-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
              <div className="cart-summary-row"><span>Shipping</span><strong className="cart-free">FREE</strong></div>
              <div className="cart-vat-note">All prices are VAT inclusive.</div>
              <div className="cart-summary-total"><span>Total</span><strong>{money(subtotal)}</strong></div>
              <Link href="/checkout" className="cart-v2-primary cart-checkout-button">Proceed to Checkout <span>→</span></Link>
              <div className="cart-summary-benefits">
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
