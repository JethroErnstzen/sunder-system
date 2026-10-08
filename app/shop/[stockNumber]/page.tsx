import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import ProductGallery from '@/app/components/ProductGallery'
import AddToCartButton from '@/app/components/AddToCartButton'
import styles from './product.module.css'

export default async function ProductPage({ params }: { params: Promise<{ stockNumber: string }> }) {
  const { stockNumber } = await params
  const product = await prisma.product.findUnique({ where: { stockNumber }, include: { images: { orderBy: { sortOrder: 'asc' } }, retailListings: { orderBy: { price: 'asc' } } } })
  if (!product || !product.websiteActive || product.status !== "active") notFound()
  if (product.sellingPrice == null) notFound()

  const retailListing = product.retailListings[0]
  const retailPrice = product.retailPrice ?? retailListing?.price ?? null
  const listedPrice = product.sellingPrice
  const salePrice = product.salePrice && product.salePrice > 0 && product.salePrice < listedPrice ? product.salePrice : null
  const sellingPrice = salePrice ?? listedPrice
  const saved = retailPrice && retailPrice > sellingPrice ? Math.round(retailPrice - sellingPrice) : 0
  const specs = [['Processor', product.cpu], ['Memory', product.ram], ['Storage', product.storage], ['Screen', product.screen], ['Screen Size', product.screenSize ? `${product.screenSize} inches` : null], ['Number Pad', product.hasNumpad === null ? null : product.hasNumpad ? 'Dedicated numpad' : 'No dedicated numpad'], ['Graphics', product.gpu], ['Warranty', product.warranty], ['Condition', product.condition], ['Stock Number', product.stockNumber]].filter(([,value]) => value) as [string,string][]

  return <main className={styles.page}><div className={styles.wrap}>
    <div className={styles.breadcrumb}><Link href="/shop">Shop</Link><span>/</span><span>{product.brand}</span><span>/</span><strong>{product.name}</strong></div>
    <section className={styles.top}>
      <ProductGallery images={product.images.map(image => ({id:image.id,url:image.url}))} productName={product.name}/>
      <div className={styles.info}>
        <div className={styles.eyebrow}>{product.condition}<span>•</span>{product.quantity > 0 ? 'IN STOCK' : 'OUT OF STOCK'}</div>
        <h1 className={styles.title}>{product.name}</h1>
        <div className={styles.subtitle}>{[product.cpu,product.ram,product.storage].filter(Boolean).join(' • ')}</div>
        {salePrice && <div className={styles.comparison}><span className={styles.retail}>Price R <s>{Math.round(listedPrice).toLocaleString('en-ZA')}</s></span></div>}
        <div className={styles.price} style={salePrice ? { color: '#c33227' } : undefined}>{salePrice ? 'Special ' : ''}R {Math.round(sellingPrice).toLocaleString('en-ZA')} <small style={{fontSize:13,letterSpacing:0}}>incl. VAT</small></div>
        {retailPrice && retailPrice > sellingPrice && <div className={styles.comparison}><span className={styles.retail}>Retail R {Math.round(retailPrice).toLocaleString('en-ZA')}</span><span className={styles.saving}>SAVE R {saved.toLocaleString('en-ZA')}</span></div>}
        <div className={styles.trust}><div className={styles.shipping}>FREE Nationwide Shipping</div><div>{product.warranty || 'Warranty included'}</div><div>Physical store in Bellville</div></div>
        {retailListing && <div className={styles.retailBox}><div className={styles.retailLabel}>Retail comparison</div><div className={styles.retailSingle}><div><strong>{retailListing.retailer}</strong><span>R {Math.round(retailListing.price).toLocaleString('en-ZA')}</span></div>{retailListing.url && <a href={retailListing.url} target="_blank" rel="noopener noreferrer">View retail listing ↗</a>}</div></div>}
        <AddToCartButton product={{stockNumber:product.stockNumber,name:product.name,sellingPrice:sellingPrice,listedPrice:salePrice ? listedPrice : undefined,condition:product.condition,imageUrl:product.images[0]?.url || null}} />
        <a className={styles.whatsapp} href="https://wa.me/27610571714" target="_blank" rel="noopener noreferrer">Ask about this product on WhatsApp</a>
      </div>
    </section>
    <div className={styles.lower}>
      {product.description && <section><h2>Product Description</h2><div className={styles.description}>{product.description}</div></section>}
      <section><h2>Specifications</h2><div className={styles.specGrid}>{specs.map(([label,value])=><div className={styles.spec} key={label}><strong>{label}</strong><span>{value}</span></div>)}</div><div className={styles.buyNote}>All prices include VAT. Stock is subject to availability.</div></section>
    </div>
  </div></main>
}
