import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendOrderEmails } from '@/lib/order-emails'
import { couponDiscount, normalizeCouponCode } from '@/lib/coupons'

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
  let stage = 'request validation'
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
    const requestedPaymentMethod = paymentMethods.includes(body.paymentMethod) ? String(body.paymentMethod) : null
    if (!requestedPaymentMethod) return NextResponse.json({ error: 'Choose a payment method and try again.' }, { status: 400 })

    const stockNumbers = items.map((item: any) => String(item.stockNumber)).filter(Boolean)
    if (stockNumbers.length !== items.length || new Set(stockNumbers).size !== stockNumbers.length) {
      return NextResponse.json({ error: 'Each product can only be added to an order once.' }, { status: 400 })
    }
    if (items.some((item: any) => !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1)) {
      return NextResponse.json({ error: 'Enter a valid quantity for each product.' }, { status: 400 })
    }
    stage = 'checking product stock'
    const products = await prisma.product.findMany({
      where: { stockNumber: { in: stockNumbers }, websiteActive: true, status: 'active', quantity: { gt: 0 } },
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
    })

    const byStock = new Map(products.map((p) => [p.stockNumber, p]))
    const orderItems = [] as any[]
    let subtotal = 0
    let hasLaptop = false

    for (const cartItem of items) {
      const product = byStock.get(String(cartItem.stockNumber))
      const quantity = Number(cartItem.quantity)
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
    const couponCode = normalizeCouponCode(body.couponCode)
    const coupon = couponCode ? await prisma.coupon.findUnique({ where: { code: couponCode } }) : null
    if (couponCode && !coupon) return NextResponse.json({ error: 'That discount code was not found.' }, { status: 409 })
    let discount = 0
    try {
      discount = coupon ? couponDiscount(coupon, subtotal) : 0
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'This discount code cannot be used.' }, { status: 409 })
    }
    const total = subtotal - discount + (officeAddon ? OFFICE_PRICE : 0)
    const tax = total - total / 1.15
    const paymentMethod = total === 0 ? 'coupon' : requestedPaymentMethod
    const deferPayflexSale = paymentMethod === 'payflex' && total > 0
    const deferPaymentEmails = total > 0 && ['payflex', 'stitch', 'stitchPayLater'].includes(paymentMethod)
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

    stage = 'saving customer'
    const customer = await prisma.customer.upsert({
      where: { email },
      update: {},
      create: {
        email,
        fullName: [body.firstName, body.lastName].filter(Boolean).map(String).join(' ').trim() || null,
        phone: body.phone ? String(body.phone).trim() : null,
      },
    })

    stage = 'saving order and invoice number'
    const order = await prisma.$transaction(async (transaction) => {
      // A Payflex checkout is not a sale until Payflex confirms payment.
      // Keep its stock visible and available until the verified callback.
      if (!deferPayflexSale) {
        for (const item of orderItems) {
          if (!item.productId) continue
          const claimed = await transaction.product.updateMany({
            where: {
              id: item.productId,
              websiteActive: true,
              status: 'active',
              quantity: { gte: item.quantity },
            },
            data: { quantity: { decrement: item.quantity } },
          })
          if (claimed.count !== 1) {
            throw new Error(`STOCK_UNAVAILABLE:${item.stockNumber}`)
          }
          const remaining = await transaction.product.findUnique({
            where: { id: item.productId },
            select: { quantity: true },
          })
          if (remaining?.quantity === 0) {
            const now = new Date()
            await transaction.product.update({
              where: { id: item.productId },
              data: {
                status: 'sold',
                soldAt: now,
                websiteActive: false,
                googleActive: false,
                metaActive: false,
                takealotActive: false,
              },
            })
          }
        }
      }
      if (coupon && !deferPayflexSale) {
        const currentCoupon = await transaction.coupon.findUnique({ where: { id: coupon.id } })
        if (!currentCoupon) throw new Error('COUPON_UNAVAILABLE:That discount code is no longer available.')
        try {
          couponDiscount(currentCoupon, subtotal)
        } catch (error) {
          throw new Error(`COUPON_UNAVAILABLE:${error instanceof Error ? error.message : 'This discount code cannot be used.'}`)
        }
        const used = await transaction.coupon.updateMany({
          where: { id: currentCoupon.id, active: true, usedCount: currentCoupon.usedCount },
          data: { usedCount: { increment: 1 } },
        })
        if (used.count !== 1) throw new Error('COUPON_UNAVAILABLE:That discount code has just reached its usage limit. Please try again.')
      }
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
          status: total === 0 ? 'completed' : 'pending',
          paymentStatus: total === 0 ? 'paid' : 'pending',
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
          couponId: coupon?.id || null,
          couponCode: coupon?.code || null,
          discount,
          officeAddon,
          items: { create: orderItems },
        },
        include: { items: true },
      })
    })

    if (!deferPaymentEmails) {
      stage = 'sending order emails'
      await sendOrderEmails(order)
    }

    return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber, total: order.total, paymentMethod: order.paymentMethod })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('STOCK_UNAVAILABLE:')) {
      return NextResponse.json({ error: `Product ${error.message.slice('STOCK_UNAVAILABLE:'.length)} is no longer available. Please refresh your cart.` }, { status: 409 })
    }
    if (error instanceof Error && error.message.startsWith('COUPON_UNAVAILABLE:')) {
      return NextResponse.json({ error: error.message.slice('COUPON_UNAVAILABLE:'.length) }, { status: 409 })
    }
    const prismaCode = typeof error === 'object' && error !== null && 'code' in error
      && typeof error.code === 'string' ? error.code : null
    const modelName = typeof error === 'object' && error !== null && 'meta' in error
      && typeof error.meta === 'object' && error.meta !== null && 'modelName' in error.meta
      && typeof error.meta.modelName === 'string' ? error.meta.modelName : null
    console.error('Create order error:', { stage, prismaCode, modelName, error })

    if (prismaCode === 'P2021' || prismaCode === 'P2022') {
      return NextResponse.json({
        error: modelName
          ? `The staging database schema is missing a field or table for ${modelName}. Please sync the database schema in Plesk.`
          : 'The staging database schema is out of date. Please sync the database schema in Plesk.',
      }, { status: 503 })
    }
    if (prismaCode === 'P1001' || prismaCode === 'P1002') {
      return NextResponse.json({ error: 'The order database is temporarily unavailable. Please try again shortly.' }, { status: 503 })
    }
    if (prismaCode === 'P2002') {
      return NextResponse.json({ error: 'An order number conflict occurred. Please submit the order again.' }, { status: 409 })
    }
    return NextResponse.json({ error: `Unable to create order while ${stage}. Please try again or contact sales@sunder.co.za.` }, { status: 500 })
  }
}
