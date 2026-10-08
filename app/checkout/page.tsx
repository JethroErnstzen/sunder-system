'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import styles from './checkout.module.css'

type CartItem = {
  stockNumber: string
  name: string
  sellingPrice: number
  listedPrice?: number
  quantity: number
  category?: string
  condition?: string
  isLaptop?: boolean
  image?: string | null
  imageUrl?: string | null
}

const money = (value: number) => `R ${value.toLocaleString('en-ZA')}`

function isEligibleOfficeDevice(item: CartItem) {
  if (item.isLaptop === true) return true
  const category = (item.category || '').toLowerCase()
  const name = (item.name || '').toLowerCase()
  return (
    category.includes('laptop') ||
    category.includes('notebook') ||
    category === 'gaming' ||
    category.includes('desktop') ||
    /laptop|macbook|notebook|alienware|latitude|thinkpad|thinkbook|ideapad|elitebook|probook|precision|zenbook|vivobook|inspiron|vostro|xps|pavilion|spectre|omen|legion|yoga|chromebook|desktop|tower pc|mini pc|all-in-one pc|all in one pc/.test(name)
  )
}

export default function CheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [customerType, setCustomerType] = useState<'private' | 'company'>('private')
  const [sameAsBilling, setSameAsBilling] = useState(true)
  const [officeAdded, setOfficeAdded] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'stitch' | 'eft' | 'payflex' | 'stitchPayLater'>('stitch')

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sunder-cart') || '[]')
      setItems(Array.isArray(saved) ? saved : [])
    } catch {
      setItems([])
    }
  }, [])

  const hasLaptop = useMemo(() => items.some(isEligibleOfficeDevice), [items])
  const officePrice = 499
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0),
    [items]
  )
  const total = subtotal + (officeAdded && hasLaptop ? officePrice : 0)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Payment gateway credentials/API endpoints are intentionally not wired here yet.
    // The selected method is ready to be routed once the merchant credentials are added.
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.success}>
            <div className={styles.successIcon}>✓</div>
            <h1>Order details received</h1>
            <p>Your order request has been captured. Payment integration can be connected next.</p>
            <Link href="/shop" className={styles.primaryButton}>Back to Shop</Link>
          </section>
        </div>
      </main>
    )
  }

  if (!items.length) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.success}>
            <h1>Your cart is empty</h1>
            <p>Add a product before starting checkout.</p>
            <Link href="/shop" className={styles.primaryButton}>Shop Products</Link>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>SUNDER COMPUTERS</span>
            <h1>Checkout</h1>
            <p>Securely provide your delivery details.</p>
          </div>
          <div className={styles.headerBadges}>
            <span>VAT INCLUSIVE</span>
            <span>FREE Nationwide Shipping</span>
            <span>Warranty Included</span>
          </div>
        </header>

        <form className={styles.layout} onSubmit={submit}>
          <div className={styles.form}>
            {hasLaptop && (
              <section className={`${styles.card} ${styles.officeCard}`}>
                <div className={styles.sectionHead}>
                  <div>
                    <span className={styles.sectionLabel}>OPTIONAL ADD-ON</span>
                    <h2>Add Microsoft Office</h2>
                    <p>Get Microsoft Office Professional Plus 2021 with your laptop.</p>
                  </div>
                  <strong className={styles.headPrice}>R 499 <small>incl. VAT</small></strong>
                </div>

                <label className={`${styles.officeOption} ${officeAdded ? styles.selected : ''}`}>
                  <input
                    type="checkbox"
                    checked={officeAdded}
                    onChange={(e) => setOfficeAdded(e.target.checked)}
                  />
                  <img src="/microsoft-office-2021.png" alt="" className={styles.officeThumb} />
                  <span className={styles.officeCopy}>
                    <strong>Microsoft Office Professional Plus 2021</strong>
                    <span>Lifetime licence · limited to one use and one activation</span>
                  </span>
                  <b>R 499</b>
                </label>

                <p className={styles.finePrint}>
                  Fine print: Lifetime licence, limited to one device and one use (one activation). Microsoft activation and applicable licence terms apply.
                </p>
              </section>
            )}

            <section className={styles.card}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.sectionLabel}>CUSTOMER TYPE</span>
                  <h2>Who is placing the order?</h2>
                  <p>Choose private customer or company for the correct invoice details.</p>
                </div>
              </div>

              <div className={styles.typeGrid}>
                <label className={`${styles.typeOption} ${customerType === 'private' ? styles.selected : ''}`}>
                  <input type="radio" name="customerType" checked={customerType === 'private'} onChange={() => setCustomerType('private')} />
                  <span><strong>Private Individual</strong><small>Personal purchase</small></span>
                </label>
                <label className={`${styles.typeOption} ${customerType === 'company' ? styles.selected : ''}`}>
                  <input type="radio" name="customerType" checked={customerType === 'company'} onChange={() => setCustomerType('company')} />
                  <span><strong>Company</strong><small>Business purchase (VAT invoice)</small></span>
                </label>
              </div>
            </section>

            {customerType === 'company' && (
              <section className={styles.card}>
                <div className={styles.sectionHead}>
                  <div>
                    <span className={styles.sectionLabel}>COMPANY DETAILS</span>
                    <h2>Company billing information</h2>
                    <p>These details will be used for your VAT invoice.</p>
                  </div>
                </div>
                <div className={styles.grid}>
                  <label>Company Name<input required name="companyName" /></label>
                  <label>VAT Number<input required name="vatNumber" /></label>
                  <label>Registration Number<input name="registrationNumber" /></label>
                  <label className={styles.full}>Company Billing Address<input required name="companyAddress" /></label>
                  <label>Suburb<input required name="companySuburb" /></label>
                  <label>City<input required name="companyCity" /></label>
                  <label>Province<input required name="companyProvince" /></label>
                  <label>Postal Code<input required name="companyPostalCode" /></label>
                </div>
              </section>
            )}

            <section className={styles.card}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.sectionLabel}>CONTACT DETAILS</span>
                  <h2>Your details</h2>
                  <p>We will use these details to contact you about your order.</p>
                </div>
              </div>
              <div className={styles.grid}>
                <label>First Name<input required name="firstName" /></label>
                <label>Last Name<input required name="lastName" /></label>
                <label>Email Address<input required type="email" name="email" /></label>
                <label>Mobile Number<input required name="mobile" /></label>
              </div>
            </section>

            {customerType === 'private' && (
              <section className={styles.card}>
                <div className={styles.sectionHead}>
                  <div>
                    <span className={styles.sectionLabel}>BILLING ADDRESS</span>
                    <h2>Billing address</h2>
                  </div>
                </div>
                <div className={styles.grid}>
                  <label className={styles.full}>Street Address<input required name="billingAddress" /></label>
                  <label>Suburb<input required name="billingSuburb" /></label>
                  <label>City<input required name="billingCity" /></label>
                  <label>Province<input required name="billingProvince" /></label>
                  <label>Postal Code<input required name="billingPostalCode" /></label>
                </div>
              </section>
            )}

            <section className={styles.card}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.sectionLabel}>DELIVERY</span>
                  <h2>Delivery address</h2>
                  <p>Where should we deliver your order?</p>
                </div>
              </div>

              <label className={styles.sameAddress}>
                <input type="checkbox" checked={sameAsBilling} onChange={(e) => setSameAsBilling(e.target.checked)} />
                <span><strong>Delivery address same as billing address</strong><small>Use the billing address for delivery.</small></span>
              </label>

              {!sameAsBilling && (
                <div className={styles.grid}>
                  <label className={styles.full}>Street Address<input required name="deliveryAddress" /></label>
                  <label>Suburb<input required name="deliverySuburb" /></label>
                  <label>City<input required name="deliveryCity" /></label>
                  <label>Province<input required name="deliveryProvince" /></label>
                  <label>Postal Code<input required name="deliveryPostalCode" /></label>
                </div>
              )}
            </section>

            <section className={styles.card}>
              <div className={styles.shipping}>
                <div><strong>FREE Nationwide Shipping</strong><span>Included in your order</span></div>
                <b>FREE</b>
              </div>
            </section>

          </div>

          <aside className={styles.summary}>
            <div className={styles.summaryHeader}>
              <span className={styles.kicker}>YOUR ORDER</span>
              <Link href="/cart">Edit cart</Link>
            </div>

            <div className={styles.summaryProducts}>
              {items.map((item) => {
                const image = item.image || item.imageUrl || null
                return (
                  <div className={styles.product} key={item.stockNumber}>
                    <div className={styles.productThumb}>
                      {image ? <img src={image} alt="" /> : <span>SUNDER</span>}
                    </div>
                    <div className={styles.productInfo}>
                      <strong>{item.name}</strong>
                      <span>{[item.category, item.condition].filter(Boolean).join(' · ') || 'Computer'} · Qty {item.quantity}</span>
                      <b>{item.listedPrice && item.listedPrice > item.sellingPrice && <><s>{money(item.listedPrice * item.quantity)}</s> </>}{money(item.sellingPrice * item.quantity)}</b>
                    </div>
                  </div>
                )
              })}

              {officeAdded && hasLaptop && (
                <div className={styles.product}>
                  <div className={styles.productThumb}>
                    <img src="/microsoft-office-2021.png" alt="" />
                  </div>
                  <div className={styles.productInfo}>
                    <strong>Microsoft Office Professional Plus 2021</strong>
                    <span>1 device · 1 activation</span>
                    <b>{money(officePrice)}</b>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.lines}>
              <div><span>Products</span><strong>{money(subtotal)}</strong></div>
              {officeAdded && hasLaptop && <div><span>Microsoft Office 2021</span><strong>{money(officePrice)}</strong></div>}
              <div><span>Shipping</span><strong className={styles.free}>FREE</strong></div>
            </div>

            <p className={styles.vatNote}>Prices shown include VAT.</p>

            <div className={styles.total}>
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>

            <div className={styles.paymentMethods}>
              <div className={styles.paymentHeading}>Payment Method</div>
              <label className={`${styles.paymentOption} ${paymentMethod === 'stitch' ? styles.paymentSelected : ''}`}><input type="radio" name="paymentMethod" value="stitch" checked={paymentMethod === 'stitch'} onChange={() => setPaymentMethod('stitch')} /><span className={styles.paymentOptionCopy}><strong>Stitch Express</strong><span>Apple Pay · Google Pay · Capitec Pay · Card · BNPL</span><small>Secure payments powered by Stitch Express</small></span><img src="https://www.sunder.co.za/wp-content/plugins/stitch-express/assets/wc-logo-v2.svg" alt="" className={styles.paymentLogo} /></label>
              <label className={`${styles.paymentOption} ${paymentMethod === 'payflex' ? styles.paymentSelected : ''}`}><input type="radio" name="paymentMethod" value="payflex" checked={paymentMethod === 'payflex'} onChange={() => setPaymentMethod('payflex')} /><span className={styles.paymentOptionCopy}><strong>Payflex</strong><span>Pay over time with Payflex</span></span><img src="https://www.sunder.co.za/wp-content/plugins/payflex-payment-gateway/Checkout.png" alt="" className={styles.payflexLogo} /></label>
              <label className={`${styles.paymentOption} ${paymentMethod === 'stitchPayLater' ? styles.paymentSelected : ''}`}><input type="radio" name="paymentMethod" value="stitchPayLater" checked={paymentMethod === 'stitchPayLater'} onChange={() => setPaymentMethod('stitchPayLater')} /><span className={styles.paymentOptionCopy}><strong>Stitch Pay Later</strong><span>Choose Stitch Pay Later at payment</span></span><img src="https://www.sunder.co.za/wp-content/plugins/stitch-express/assets/blocks/stitch.svg" alt="" className={styles.paymentLogo} /></label>
              <label className={`${styles.paymentOption} ${paymentMethod === 'eft' ? styles.paymentSelected : ''}`}><input type="radio" name="paymentMethod" value="eft" checked={paymentMethod === 'eft'} onChange={() => setPaymentMethod('eft')} /><span className={styles.paymentOptionCopy}><strong>EFT / Bank Transfer</strong><span>Pay directly into our FNB account</span></span></label>
              <button type="submit" className={styles.summaryPaymentButton}>Proceed to Payment</button>
              {paymentMethod === 'eft' && <div className={styles.eftDetails}><div className={styles.eftTitle}>EFT payment details</div><div className={styles.eftGrid}><div><span>Bank</span><strong>FNB</strong></div><div><span>Account Name</span><strong>Sunder Computers</strong></div><div><span>Account Number</span><strong>630 384 69713</strong></div><div><span>Branch Code</span><strong>220323</strong></div></div></div>}
            </div>

            <div className={styles.benefits}>
              <div><strong>Shipping</strong><span>FREE nationwide</span></div>
              <div><strong>Warranty</strong><span>Included</span></div>
              <div><strong>Store</strong><span>Bellville, Cape Town</span></div>
            </div>
          </aside>
        </form>
      </div>
    </main>
  )
}
