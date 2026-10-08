import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function parseScreenSize(screen, name) {
  const text = `${screen || ''} ${name || ''}`
  const match = text.match(/(\d+(?:\.\d+)?)\s*-?\s*(?:\"|”|inch|in)/i)
  return match ? Number(match[1]) : null
}

try {
  const products = await prisma.product.findMany({
    where: { screenSize: null },
    select: { id: true, stockNumber: true, screen: true, name: true },
  })

  let updated = 0
  const unresolved = []
  for (const product of products) {
    const screenSize = parseScreenSize(product.screen, product.name)
    if (screenSize === null) {
      if (unresolved.length < 5) unresolved.push(`${product.stockNumber}: ${product.screen || '(no screen text)'} | ${product.name}`)
      continue
    }
    await prisma.product.update({ where: { id: product.id }, data: { screenSize } })
    updated += 1
  }

  console.log(`Backfilled ${updated} of ${products.length} products with explicit screen sizes.`)
  if (unresolved.length) console.log(`Unresolved examples: ${unresolved.join(' ; ')}`)
} finally {
  await prisma.$disconnect()
}