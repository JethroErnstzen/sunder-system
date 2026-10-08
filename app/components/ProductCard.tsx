'use client'

import Link from 'next/link'

export type ProductCardProduct = {
  id: string
  stockNumber: string
  name: string
  brand?: string | null
  condition: string
  cpu?: string | null
  ram?: string | null
  storage?: string | null
  sellingPrice: number
  salePrice?: number | null
  retailPrice?: number | null
  warranty?: string | null
  quantity: number
  images?: { url: string }[]
}

export default function ProductCard({ product, compact = false }: { product: ProductCardProduct; compact?: boolean }) {
  const image = product.images?.[0]?.url || null
  const retail = Number(product.retailPrice || 0)
  const listedPrice = Number(product.sellingPrice || 0)
  const salePrice = Number(product.salePrice || 0)
  const onSale = salePrice > 0 && salePrice < listedPrice
  const price = onSale ? salePrice : listedPrice
  const saving = retail > price ? Math.round((retail - price) / 100) * 100 : 0
  const condition = product.condition.toUpperCase()

  return (
    <Link
      href={`/shop/${product.stockNumber}`}
      style={{
        display: 'block',
        minWidth: 0,
        background: '#fff',
        color: '#101827',
        border: '1px solid #d8e1ee',
        borderRadius: 3,
        overflow: 'hidden',
        textDecoration: 'none',
        boxShadow: '0 2px 7px rgba(20,50,100,.045)',
      }}
    >
      <div style={{ position: 'relative', width: '100%', background: '#f5f8fc', borderBottom: '1px solid #e6ebf2', overflow: 'hidden', lineHeight: 0 }}>
        {image ? (
          <img src={image} alt={product.name} style={{ display: 'block', width: '100%', height: 'auto', maxWidth: '100%', objectFit: 'contain', objectPosition: 'center', margin: 0 }} />
        ) : (
          <div style={{ minHeight: compact ? 110 : 150, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, letterSpacing: '.1em', color: '#5f78a0' }}>SUNDER COMPUTERS</div>
        )}
        <span style={{ position: 'absolute', top: 7, left: 7, padding: '4px 6px', borderRadius: 2, background: '#101827', color: '#fff', fontSize: 10, fontWeight: 900, letterSpacing: '.04em', lineHeight: 1.1 }}>{condition}</span>
        {saving > 0 && <span style={{ position: 'absolute', top: 7, right: 7, padding: '4px 6px', borderRadius: 2, background: '#0b9a63', color: '#fff', fontSize: 10, fontWeight: 900, lineHeight: 1.1 }}>SAVE R {saving.toLocaleString('en-ZA')}</span>}
      </div>
      <div style={{ padding: compact ? '8px 9px 9px' : '10px 11px 11px' }}>
        <h3 style={{ fontSize: compact ? 14 : 16, lineHeight: 1.2, margin: '0 0 7px', minHeight: compact ? 36 : 41, color: '#101827' }}>{product.name}</h3>
        {onSale ? <div style={{ fontSize: 14, fontWeight: 750, color: '#58677c', marginTop: 4 }}>Price <s>R {Math.round(listedPrice).toLocaleString('en-ZA')}</s></div> : <div style={{ fontSize: compact ? 21 : 23, fontWeight: 900, marginTop: 4, color: '#1769ff' }}>R {Math.round(price).toLocaleString('en-ZA')} <small style={{ fontSize: 10, color: '#68778d', fontWeight: 800 }}>incl. VAT</small></div>}
        {retail > 0 && <div style={{ fontSize: 14, fontWeight: 750, color: '#58677c', marginTop: 3 }}>Retail R {Math.round(retail).toLocaleString('en-ZA')}</div>}
        {onSale && <div style={{ fontSize: compact ? 21 : 23, fontWeight: 900, color: '#c33227', marginTop: 3 }}>Special R {Math.round(price).toLocaleString('en-ZA')} <small style={{ fontSize: 10, color: '#68778d', fontWeight: 800 }}>incl. VAT</small></div>}
        <div style={{ display: 'grid', gap: 4, marginTop: 8, paddingTop: 7, borderTop: '1px solid #edf1f6', fontSize: 11, fontWeight: 750, color: '#607087', lineHeight: 1.35 }}>
          <span>{product.warranty || 'Warranty included'}</span>
          <span>FREE Nationwide Shipping</span>
        </div>
      </div>
    </Link>
  )
}
