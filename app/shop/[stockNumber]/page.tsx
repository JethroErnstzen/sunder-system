import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import ProductGallery from '@/app/components/ProductGallery'
import AddToCartButton from '@/app/components/AddToCartButton'
import StitchBNPLWidget from '@/app/components/StitchBNPLWidget'
import PayflexWidget from '@/app/components/PayflexWidget'
import styles from './product.module.css'

const money = (value: number) => `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default async function ProductPage({ params }: { params: Promise<{ stockNumber: string }> }) {
  const { stockNumber } = await params
  const product = await prisma.product.findUnique({ where: { stockNumber }, include: { images: { orderBy: { sortOrder: 'asc' } }, retailListings: { orderBy: { price: 'asc' } } } })
  if (!product || !product.websiteActive || product.status !== "active" || product.quantity <= 0) notFound()
  if (product.sellingPrice == null) notFound()

  const productOrigin = process.env.APP_BASE_URL?.trim() || 'https://www.sunder.co.za'
  let productUrl: string
  try {
    productUrl = new URL(`/shop/${encodeURIComponent(product.stockNumber)}`, productOrigin).toString()
  } catch {
    productUrl = `https://www.sunder.co.za/shop/${encodeURIComponent(product.stockNumber)}`
  }
  const whatsappMessage = `Hi Sunder Computers, I'd like to enquire about this product:\n${productUrl}`

  const retailListing = product.retailListings[0]
  const retailPrice = product.retailPrice ?? retailListing?.price ?? null
  const listedPrice = product.sellingPrice
  const salePrice = product.salePrice && product.salePrice > 0 && product.salePrice < listedPrice ? product.salePrice : null
  const sellingPrice = salePrice ?? listedPrice
  const saved = retailPrice && retailPrice > sellingPrice ? retailPrice - sellingPrice : 0
  const specs = [['Processor', product.cpu], ['Memory', product.ram], ['Storage', product.storage], ['Screen', product.screen], ['Screen Size', product.screenSize ? `${product.screenSize} inches` : null], ['Number Pad', product.hasNumpad === null ? null : product.hasNumpad ? 'Dedicated numpad' : 'No dedicated numpad'], ['Graphics', product.gpu], ['Warranty', product.warranty], ['Condition', product.condition], ['Stock Number', product.stockNumber]].filter(([,value]) => value) as [string,string][]

  return <main className={styles.page}><div className={styles.wrap}>
    <div className={styles.breadcrumb}><Link href="/shop">Shop</Link><span>/</span><span>{product.brand}</span><span>/</span><strong>{product.name}</strong></div>
    <section className={styles.top}>
      <ProductGallery images={product.images.map(image => ({id:image.id,url:image.url}))} productName={product.name}/>
      <div className={styles.info}>
        <div className={styles.eyebrow}>{product.condition}<span>•</span>IN STOCK · {product.quantity} available</div>
        <h1 className={styles.title}>{product.name}</h1>
        {(retailPrice || salePrice) && <div className={styles.priceHighlights}>
          {retailPrice && retailPrice > 0 && <div className={styles.retailLine}>Retail price: {money(retailPrice)}</div>}
          {salePrice && <div className={styles.previousLine}>Was: {money(listedPrice)}</div>}
        </div>}
        <div className={`${styles.price}${salePrice ? ` ${styles.specialPrice}` : ''}`}>{salePrice ? 'Now Only: ' : 'Price: '}{money(sellingPrice)} <small>incl. VAT</small></div>
        {saved > 0 && <div className={styles.savingBanner}><span>YOU SAVE</span><strong>{money(saved)}</strong></div>}
        {retailListing && <div className={styles.retailBox}><div className={styles.retailLabel}>Retail comparison</div><div className={styles.retailSingle}><div><strong>{retailListing.retailer}</strong><span>{money(retailListing.price)}</span></div>{retailListing.url && <a href={retailListing.url} target="_blank" rel="noopener noreferrer">View retail listing ↗</a>}</div></div>}
        {sellingPrice >= 10 && <div className={styles.bnplOptions}>
          {sellingPrice >= 100 && <div className={styles.bnpl}><StitchBNPLWidget price={sellingPrice} /></div>}
          <div className={styles.bnpl}><PayflexWidget price={sellingPrice} /></div>
        </div>}
        <div className={styles.trust}><div className={styles.shipping}>FREE Nationwide Shipping</div><div>{product.warranty || 'Warranty included'}</div><div>Physical store in Bellville</div></div>
        <AddToCartButton product={{stockNumber:product.stockNumber,name:product.name,sellingPrice:sellingPrice,listedPrice:salePrice ? listedPrice : undefined,condition:product.condition,imageUrl:product.images[0]?.url || null,availableQuantity:product.quantity}} />
        <a className={styles.whatsapp} href={`https://wa.me/27610571714?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noopener noreferrer">Ask about this product on WhatsApp</a>
      </div>
    </section>
    <div className={styles.lower}>
      {product.description && <section><h2>Product Description</h2><div className={styles.description}>{product.description}</div></section>}
      <section><h2>Specifications</h2><div className={styles.specGrid}>{specs.map(([label,value])=><div className={styles.spec} key={label}><strong>{label}</strong><span>{value}</span></div>)}</div><div className={styles.buyNote}>All prices include VAT. Stock is subject to availability.</div></section>
    </div>
  </div></main>
}
