import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'

const prisma = new PrismaClient()
const products = JSON.parse(fs.readFileSync(new URL('../data/current-products.json', import.meta.url), 'utf8'))

function parseScreenSize(value, name) {
  const text = `${value || ''} ${name || ''}`
  const match = text.match(/(\d+(?:\.\d+)?)\s*-?\s*(?:\"|”|inch|in)/i)
  return match ? Number(match[1]) : null
}

try {
  await prisma.productImage.deleteMany()
  await prisma.retailListing.deleteMany()
  await prisma.product.deleteMany()

  for (const p of products) {
    await prisma.product.create({
      data: {
        stockNumber: p.stockNumber,
        name: p.name,
        brand: p.brand || null,
        model: p.model || null,
        condition: p.condition || 'Pre-owned',
        category: p.category || null,
        cpu: p.cpu || null,
        ram: p.ram || null,
        storage: p.storage || null,
        screen: p.screen || null,
        screenSize: parseScreenSize(p.screen, p.name),
        gpu: p.gpu || null,
        warranty: p.warranty || null,
        description: p.description || null,
        costPrice: p.costPrice ?? null,
        sellingPrice: p.sellingPrice ?? null,
        retailPrice: p.retailPrice ?? null,
        quantity: Number.isFinite(Number(p.quantity)) ? Math.trunc(Number(p.quantity)) : 0,
        websiteActive: true,
        googleActive: Boolean(p.googleActive),
        metaActive: Boolean(p.metaActive),
        takealotActive: false,
        images: p.images?.length ? {
          create: p.images.map((url, index) => ({ url, sortOrder: index, isPrimary: index === 0 }))
        } : undefined,
      }
    })
  }

  console.log(`Imported ${products.length} products.`)
} finally {
  await prisma.$disconnect()
}
