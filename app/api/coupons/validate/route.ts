import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { couponDiscount, normalizeCouponCode } from '@/lib/coupons'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const code = normalizeCouponCode(body.code)
    const items = Array.isArray(body.items) ? body.items : []
    if (!code || !items.length) return NextResponse.json({ error: 'Enter a discount code and add products to your cart.' }, { status: 400 })

    const stockNumbers = items.map((item: any) => String(item.stockNumber || '')).filter(Boolean)
    if (stockNumbers.length !== items.length || new Set(stockNumbers).size !== stockNumbers.length) {
      return NextResponse.json({ error: 'Each product can only be added to your cart once.' }, { status: 400 })
    }
    if (items.some((item: any) => !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1)) {
      return NextResponse.json({ error: 'Enter a valid quantity for each product.' }, { status: 400 })
    }
    const products = await prisma.product.findMany({
      where: { stockNumber: { in: stockNumbers }, websiteActive: true, status: 'active', quantity: { gt: 0 } },
      select: { stockNumber: true, sellingPrice: true, salePrice: true, quantity: true },
    })
    const byStock = new Map(products.map((product) => [product.stockNumber, product]))
    let subtotal = 0
    for (const item of items) {
      const product = byStock.get(String(item.stockNumber || ''))
      const quantity = Number(item.quantity)
      const price = product?.salePrice && product.salePrice > 0 && product.salePrice < (product.sellingPrice || 0)
        ? product.salePrice
        : product?.sellingPrice
      if (!product || !price || product.quantity < quantity) return NextResponse.json({ error: 'A product in your cart is no longer available in that quantity.' }, { status: 409 })
      subtotal += price * quantity
    }

    const coupon = await prisma.coupon.findUnique({ where: { code } })
    if (!coupon) return NextResponse.json({ error: 'That discount code was not found.' }, { status: 404 })
    const discount = couponDiscount(coupon, subtotal)
    return NextResponse.json({ code: coupon.code, discount, subtotalAfterDiscount: Math.max(0, subtotal - discount) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to check this discount code.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
