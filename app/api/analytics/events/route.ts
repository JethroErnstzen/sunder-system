import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { CUSTOMER_COOKIE, verifyCustomerSession } from '@/lib/customer-auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const eventSchema = z.object({
  sessionKey: z.string().uuid(),
  visitorKey: z.string().uuid(),
  eventType: z.enum(['page_view', 'product_view', 'page_time', 'heartbeat', 'sign_up', 'sign_in', 'add_to_cart', 'remove_from_cart', 'cart_view', 'cart_item_view', 'cart_quantity', 'checkout_view', 'checkout_started', 'checkout_submitted', 'order_submitted']),
  path: z.string().startsWith('/').max(500),
  title: z.string().max(200).optional(),
  productStockNumber: z.string().max(80).optional(),
  quantity: z.number().int().min(0).max(1000).optional(),
  durationMs: z.number().int().min(0).max(3_600_000).optional(),
  paymentMethod: z.enum(['stitch', 'eft', 'payflex']).optional(),
  orderNumber: z.string().max(80).optional(),
  referrerHost: z.string().max(120).optional(),
  campaignSource: z.string().max(120).optional(),
  campaignMedium: z.string().max(120).optional(),
  campaignName: z.string().max(120).optional(),
})

let lastCleanup = 0
export async function POST(request: Request) {
  const body = eventSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ ok: false }, { status: 400 })
  try {
    const data = body.data
    const now = new Date()
    const cookieStore = await cookies()
    const signedInToken = verifyCustomerSession(cookieStore.get(CUSTOMER_COOKIE)?.value)
    const signedIn = signedInToken ? await prisma.customer.findUnique({ where: { id: signedInToken.customerId }, select: { id: true, sessionVersion: true } }) : null
    const authenticatedCustomerId = signedIn && signedIn.sessionVersion === signedInToken?.sessionVersion ? signedIn.id : null
    const linkedOrder = data.eventType === 'order_submitted' && data.orderNumber
      ? await prisma.order.findUnique({ where: { orderNumber: data.orderNumber }, select: { customerId: true, paymentMethod: true } })
      : null
    const knownVisitor = await prisma.analyticsSession.findFirst({
      where: { visitorKey: data.visitorKey, customerId: { not: null } },
      orderBy: { lastSeenAt: 'desc' },
      select: { customerId: true },
    })
    const customerId = authenticatedCustomerId || linkedOrder?.customerId || knownVisitor?.customerId || null
    let productName: string | undefined
    if (data.productStockNumber) {
      const product = await prisma.product.findUnique({ where: { stockNumber: data.productStockNumber }, select: { name: true } })
      productName = product?.name?.slice(0, 240)
    }

    const source = data.campaignSource?.trim() || data.referrerHost?.trim() || 'direct'
    const session = await prisma.analyticsSession.upsert({
      where: { sessionKey: data.sessionKey },
      create: {
        sessionKey: data.sessionKey,
        visitorKey: data.visitorKey,
        customerId,
        firstSeenAt: now,
        lastSeenAt: now,
        landingPage: data.path,
        lastPage: data.path,
        lastTitle: data.title,
        source: source.slice(0, 120),
        referrerHost: data.referrerHost?.slice(0, 120),
        campaignSource: data.campaignSource?.slice(0, 120),
        campaignMedium: data.campaignMedium?.slice(0, 120),
        campaignName: data.campaignName?.slice(0, 120),
      },
      update: {
        visitorKey: data.visitorKey,
        lastSeenAt: now,
        lastPage: data.path,
        lastTitle: data.title,
        ...(customerId ? { customerId } : {}),
      },
      select: { id: true },
    })

    if (data.eventType !== 'heartbeat') {
      await prisma.analyticsEvent.create({ data: {
        sessionId: session.id,
        eventType: data.eventType,
        path: data.path,
        title: data.title,
        productStockNumber: data.productStockNumber,
        productName,
        quantity: data.quantity,
        durationMs: data.durationMs,
        paymentMethod: linkedOrder?.paymentMethod || data.paymentMethod,
        createdAt: now,
      } })
    }

    if (customerId) {
      // Link earlier anonymous journeys from this browser to the existing account once the visitor identifies themselves.
      await prisma.analyticsSession.updateMany({
        where: { visitorKey: data.visitorKey, customerId: null },
        data: { customerId },
      })
    }

    // Retain detailed journey data for 90 days, then remove old sessions and their events.
    if (now.getTime() - lastCleanup > 24 * 60 * 60 * 1000) {
      lastCleanup = now.getTime()
      const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      await prisma.analyticsEvent.deleteMany({ where: { createdAt: { lt: cutoff } } })
      await prisma.analyticsSession.deleteMany({ where: { lastSeenAt: { lt: cutoff } } })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Analytics event failed:', error)
    return NextResponse.json({ ok: false }, { status: 503 })
  }
}
