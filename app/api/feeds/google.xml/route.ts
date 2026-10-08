import { prisma } from '@/lib/prisma'

function esc(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

export async function GET() {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001').replace(/\/$/, '')
  const products = await prisma.product.findMany({
    where: { websiteActive: true, googleActive: true, status: "active", quantity: { gt: 0 } },
    include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
    orderBy: { updatedAt: 'desc' },
  })

  const items = products.map((p) => {
    const image = p.images[0]?.url ? (p.images[0].url.startsWith('http') ? p.images[0].url : `${site}${p.images[0].url}`) : ''
    const link = `${site}/shop/${encodeURIComponent(p.stockNumber)}`
    const price = Number(p.sellingPrice || 0).toFixed(2) + ' ZAR'
    const salePrice = p.salePrice && p.salePrice > 0 && p.salePrice < (p.sellingPrice || 0) ? `<g:sale_price>${Number(p.salePrice).toFixed(2)} ZAR</g:sale_price>` : ''
    return `<item><g:id>${esc(p.stockNumber)}</g:id><g:title>${esc(p.name)}</g:title><g:description>${esc(p.description || p.name)}</g:description><g:link>${esc(link)}</g:link><g:image_link>${esc(image)}</g:image_link><g:availability>in_stock</g:availability><g:condition>${esc((p.condition || 'pre-owned').toLowerCase().replace('pre-owned','used'))}</g:condition><g:price>${price}</g:price>${salePrice}${p.brand ? `<g:brand>${esc(p.brand)}</g:brand>` : ''}</item>`
  }).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Sunder Computers</title><link>${esc(site)}</link><description>Sunder Computers product feed</description>${items}</channel></rss>`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } })
}
