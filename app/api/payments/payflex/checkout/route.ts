import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createPayflexOrder, isPayflexConfigured } from '@/lib/payflex'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const orderId = typeof body.orderId === 'string' ? body.orderId : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!orderId || !email) return NextResponse.json({ error: 'Order details are required.' }, { status: 400 })
    if (!isPayflexConfigured()) return NextResponse.json({ error: 'Payflex is not configured. Please choose EFT or contact Sunder Computers.' }, { status: 503 })

    const order = await prisma.order.findFirst({
      where: { id: orderId, email, paymentMethod: 'payflex' },
      include: { items: true },
    })
    if (!order) return NextResponse.json({ error: 'Order could not be verified.' }, { status: 404 })
    if (order.paymentStatus === 'paid') return NextResponse.json({ error: 'This order has already been paid.' }, { status: 409 })
    if (order.status === 'cancelled') return NextResponse.json({ error: 'This order was cancelled. Please place a new order to try Payflex again.' }, { status: 409 })
    if (order.total < 10) return NextResponse.json({ error: 'Payflex orders must be at least R10.' }, { status: 400 })

    const existing = await prisma.paymentTransaction.findFirst({
      where: { orderId: order.id, provider: 'payflex', status: { in: ['pending', 'initiating'] } },
      orderBy: { createdAt: 'desc' },
    })
    if (existing?.status === 'pending' && existing.checkoutUrl && existing.externalId
      && Date.now() - existing.updatedAt.getTime() < 50 * 60 * 1000) {
      return NextResponse.json({ redirectUrl: existing.checkoutUrl, orderNumber: order.orderNumber })
    }
    if (existing?.status === 'initiating' && Date.now() - existing.updatedAt.getTime() < 90 * 1000) {
      return NextResponse.json({ error: 'Payflex checkout is already being started. Please wait a moment and retry.' }, { status: 409 })
    }

    const transaction = await prisma.paymentTransaction.create({
      data: { orderId: order.id, provider: 'payflex', status: 'initiating' },
    })
    const merchantReference = `${order.orderNumber}-${transaction.id}`

    try {
      await prisma.paymentTransaction.update({ where: { id: transaction.id }, data: { externalRef: merchantReference } })
      const checkout = await createPayflexOrder({
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        tax: order.tax,
        shipping: order.shipping,
        email: order.email,
        phone: order.phone,
        firstName: order.firstName,
        lastName: order.lastName,
        billingAddress: order.billingAddress,
        billingSuburb: order.billingSuburb,
        billingCity: order.billingCity,
        billingProvince: order.billingProvince,
        billingPostalCode: order.billingPostalCode,
        shippingAddress: order.shippingAddress,
        shippingSuburb: order.shippingSuburb,
        shippingCity: order.shippingCity,
        shippingProvince: order.shippingProvince,
        shippingPostalCode: order.shippingPostalCode,
        items: order.items.map((item) => ({
          stockNumber: item.stockNumber,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      }, merchantReference)
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: 'pending', externalId: checkout.orderId, checkoutUrl: checkout.redirectUrl },
      })
      return NextResponse.json({ redirectUrl: checkout.redirectUrl, orderNumber: order.orderNumber })
    } catch (error) {
      await prisma.paymentTransaction.update({ where: { id: transaction.id }, data: { status: 'failed', checkoutUrl: null } })
      throw error
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PAYFLEX_CHECKOUT_FAILED'
    console.error('[Payflex checkout failed]', code)
    const status = code === 'PAYFLEX_CREDENTIALS_MISSING' ? 503 : 502
    return NextResponse.json({ error: 'Unable to start Payflex checkout. Please try again or choose EFT.' }, { status })
  }
}
