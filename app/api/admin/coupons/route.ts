import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { normalizeCouponCode } from '@/lib/coupons'

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(coupons)
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })
  try {
    const body = await request.json()
    const code = normalizeCouponCode(body.code)
    const discountType = body.discountType === 'fixed' ? 'fixed' : 'percentage'
    const value = Number(body.value)
    const minimumOrder = body.minimumOrder === '' || body.minimumOrder == null ? null : Number(body.minimumOrder)
    const maxUses = body.maxUses === '' || body.maxUses == null ? null : Number(body.maxUses)
    const startsAt = body.startsAt ? new Date(`${body.startsAt}T00:00:00.000Z`) : null
    const expiresAt = body.expiresAt ? new Date(`${body.expiresAt}T23:59:59.999Z`) : null

    if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)) return NextResponse.json({ error: 'Use 3–32 letters, numbers, dashes or underscores.' }, { status: 400 })
    if (!Number.isFinite(value) || value <= 0 || (discountType === 'percentage' && value > 100)) {
      return NextResponse.json({ error: discountType === 'percentage' ? 'Percentage must be between 1 and 100.' : 'Discount amount must be greater than zero.' }, { status: 400 })
    }
    if (minimumOrder !== null && (!Number.isFinite(minimumOrder) || minimumOrder < 0)) return NextResponse.json({ error: 'Minimum order must be zero or greater.' }, { status: 400 })
    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) return NextResponse.json({ error: 'Usage limit must be a whole number greater than zero.' }, { status: 400 })
    if ((startsAt && Number.isNaN(startsAt.getTime())) || (expiresAt && Number.isNaN(expiresAt.getTime())) || (startsAt && expiresAt && startsAt > expiresAt)) {
      return NextResponse.json({ error: 'Check the promotion start and end dates.' }, { status: 400 })
    }

    const coupon = await prisma.coupon.create({
      data: { code, discountType, value, minimumOrder, maxUses, startsAt, expiresAt, active: body.active !== false },
    })
    return NextResponse.json(coupon, { status: 201 })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'That discount code already exists.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Unable to create discount code.' }, { status: 400 })
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })
  try {
    const body = await request.json()
    if (!body.id || typeof body.active !== 'boolean') return NextResponse.json({ error: 'Coupon and active status are required.' }, { status: 400 })
    const coupon = await prisma.coupon.update({ where: { id: String(body.id) }, data: { active: body.active } })
    return NextResponse.json(coupon)
  } catch {
    return NextResponse.json({ error: 'Unable to update discount code.' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Coupon is required.' }, { status: 400 })
    await prisma.coupon.delete({ where: { id: String(id) } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unable to delete discount code.' }, { status: 400 })
  }
}
