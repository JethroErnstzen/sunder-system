import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendOrderEmails } from '@/lib/order-emails'

const OFFICE_PRICE = 499

function isEligibleOfficeDevice(product: { category: string | null; name: string }) {
  const category = (product.category || '').toLowerCase()
  const name = product.name.toLowerCase()
  return (
    category.includes('laptop') ||
    category.includes('notebook') ||
    category === 'gaming' ||
    category.includes('desktop') ||
    /laptop|macbook|notebook|alienware|latitude|thinkpad|thinkbook|ideapad|elitebook|probook|precision|zenbook|vivobook|inspiron|vostro|xps|pavilion|spectre|omen|legion|yoga|chromebook|desktop|tower pc|mini pc|all-in-one pc|all in one pc/.test(name)
  )
}

function makeOrderNumber() {
  const stamp = Date.now().toString().slice(-8)
  const random = Math.floor(100 + Math.random() * 900)
  return `SUN-${stamp}-${random}`
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const items = Array.isArray(body.items) ? body.items : []
    if (!items.length) return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 })
    if (!body.email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    const email = String(body.email).trim().toLowerCase()
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    }
    const paymentMethods = ['stitch', 'eft', 'payflex', 'stitchPayLater']
    const paymentMethod = paymentMethods.includes(body.paymentMethod) ? String(body.paymentMethod) : null

    const stockNumbers = items.map((item: any) => String(item.stockNumber)).filter(Boolean)
    const products = await prisma.product.findMany({
      where: { stockNumber: { in: stockNumbers }, websiteActive: true },
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
    })

    const byStock = new Map(products.map((p) => [p.stockNumber, p]))
    const orderItems = [] as any[]
    let subtotal = 0
    let hasLaptop = false

    for (const cartItem of items) {
      const product = byStock.get(String(cartItem.stockNumber))
      const quantity = Math.max(1, Math.min(99, Number(cartItem.quantity) || 1))
      const effectivePrice = product?.salePrice && product.salePrice > 0 && product.salePrice < (product.sellingPrice || 0)
        ? product.salePrice
        : product?.sellingPrice;
      if (!product || !effectivePrice || product.quantity < quantity) {
        return NextResponse.json({ error: `Product unavailable or insufficient stock: ${cartItem.stockNumber}` }, { status: 409 })
      }
      hasLaptop ||= isEligibleOfficeDevice(product)
      const lineTotal = effectivePrice * quantity
      subtotal += lineTotal
      orderItems.push({
        productId: product.id,
        stockNumber: product.stockNumber,
        name: product.name,
        condition: product.condition,
        warranty: product.warranty,
        quantity,
        unitPrice: effectivePrice,
        lineTotal,
        imageUrl: product.images[0]?.url || null,
      })
    }

    const officeAddon = Boolean(body.officeAddon) && hasLaptop
    const total = subtotal + (officeAddon ? OFFICE_PRICE : 0)
    const tax = total - total / 1.15
    if (officeAddon) {
      orderItems.push({
        stockNumber: 'OFFICE-2021',
        name: 'Microsoft Office Professional Plus 2021',
        condition: 'New',
        warranty: 'Digital licence; limited to one device and one activation',
        quantity: 1,
        unitPrice: OFFICE_PRICE,
        lineTotal: OFFICE_PRICE,
        imageUrl: '/microsoft-office-2021.png',
      })
    }

    const customer = await prisma.customer.upsert({
      where: { email },
      update: {},
      create: {
        email,
        fullName: [body.firstName, body.lastName].filter(Boolean).map(String).join(' ').trim() || null,
        phone: body.phone ? String(body.phone).trim() : null,
      },
    })

    const order = await prisma.$transaction(async (transaction) => {
      const sequence = await transaction.invoiceSequence.upsert({
        where: { id: 'website-orders' },
        create: { id: 'website-orders', lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      })

      return transaction.order.create({
        data: {
          invoiceNumber: sequence.lastValue,
          orderNumber: makeOrderNumber(),
          customerId: customer.id,
          paymentMethod,
          customerType: body.customerType === 'company' ? 'company' : 'private',
          email,
          phone: body.phone || null,
          firstName: body.firstName || null,
          lastName: body.lastName || null,
          companyName: body.companyName || null,
          vatNumber: body.vatNumber || null,
          registrationNumber: body.registrationNumber || null,
          billingAddress: body.billingAddress || null,
          billingSuburb: body.billingSuburb || null,
          billingCity: body.billingCity || null,
          billingProvince: body.billingProvince || null,
          billingPostalCode: body.billingPostalCode || null,
          shippingAddress: body.shippingAddress || null,
          shippingSuburb: body.shippingSuburb || null,
          shippingCity: body.shippingCity || null,
          shippingProvince: body.shippingProvince || null,
          shippingPostalCode: body.shippingPostalCode || null,
          subtotal,
          shipping: 0,
          tax,
          total,
          officeAddon,
          items: { create: orderItems },
        },
        include: { items: true },
      })
    })

    await sendOrderEmails(order)

    return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber, total: order.total })
  } catch (error) {
    console.error('Create order error:', error)
    return NextResponse.json({ error: 'Unable to create order.' }, { status: 500 })
  }
}
