import { PrismaClient } from '@prisma/client'

const databaseUrl = process.env.DATABASE_URL || ''
if (!/^file:(?:\.\/|\.\.\/|\/)?[^?]*staging\.db(?:\?.*)?$/i.test(databaseUrl)) {
  throw new Error('Refusing to clear orders: DATABASE_URL must point to staging.db.')
}

const prisma = new PrismaClient()

try {
  const orderCount = await prisma.order.count()
  await prisma.$transaction([
    prisma.order.deleteMany({}),
    prisma.coupon.updateMany({ data: { usedCount: 0 } }),
  ])
  console.log(`Cleared ${orderCount} staging orders and reset coupon usage counts. Inventory records were left unchanged.`)
} finally {
  await prisma.$disconnect()
}
