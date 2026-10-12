
import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'node:fs'

const prisma = new PrismaClient()

try {
  const products = await prisma.product.findMany({
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      retailListings: true,
    },
    orderBy: { stockNumber: 'asc' },
  })

  const fields = [
    'brand',
    'model',
    'condition',
    'category',
    'cpu',
    'ram',
    'storage',
    'screen',
    'screenSize',
    'hasNumpad',
    'gpu',
    'warranty',
    'description',
    'sellingPrice',
    'retailPrice',
  ]

  const report = products.map((p) => ({
    stockNumber: p.stockNumber,
    name: p.name,
    missingFields: fields.filter(
      (field) =>
        p[field] === null ||
        p[field] === undefined ||
        (typeof p[field] === 'string' && !p[field].trim())
    ),
    product: {
      name: p.name,
      brand: p.brand,
      model: p.model,
      condition: p.condition,
      category: p.category,
      cpu: p.cpu,
      ram: p.ram,
      storage: p.storage,
      screen: p.screen,
      screenSize: p.screenSize,
      hasNumpad: p.hasNumpad,
      gpu: p.gpu,
      warranty: p.warranty,
      description: p.description,
      sellingPrice: p.sellingPrice,
      retailPrice: p.retailPrice,
      quantity: p.quantity,
      status: p.status,
      websiteActive: p.websiteActive,
      googleActive: p.googleActive,
      metaActive: p.metaActive,
      takealotActive: p.takealotActive,
    },
    images: p.images.map((i) => i.url),
    retailListings: p.retailListings,
  }))

  writeFileSync(
    'data/product-audit.json',
    JSON.stringify(report, null, 2),
    'utf8'
  )

  console.log(`Audited ${products.length} products.`)
  console.log('Report saved to data/product-audit.json')
} finally {
  await prisma.$disconnect()
}
