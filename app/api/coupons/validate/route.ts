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
    const products = await prisma.product.findMany({
      where: { stockNumber: { in: stockNumbers }, websiteActive: true },
      select: { stockNumber: true, sellingPrice: true, salePrice: true },
    })
    const byStock = new Map(products.map((product) => [product.stockNumber, product]))
    let subtotal = 0
    for (const item of items) {
      const product = byStock.get(String(item.stockNumber || ''))
      const quantity = Math.max(1, Math.min(99, Number(item.quantity) || 1))
      const price = product?.salePrice && product.salePrice > 0 && product.salePrice < (product.sellingPrice || 0)
        ? product.salePrice
        : product?.sellingPrice
      if (!product || !price) return NextResponse.json({ error: 'A product in your cart is no longer available.' }, { status: 409 })
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
