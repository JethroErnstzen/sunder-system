export type CouponForCalculation = {
  id: string
  code: string
  discountType: string
  value: number
  minimumOrder: number | null
  maxUses: number | null
  usedCount: number
  startsAt: Date | null
  expiresAt: Date | null
  active: boolean
}

export function normalizeCouponCode(value: unknown) {
  return String(value || '').trim().toUpperCase()
}

export function couponDiscount(coupon: CouponForCalculation, subtotal: number, now = new Date()) {
  if (!coupon.active) throw new Error('This discount code is no longer active.')
  if (coupon.startsAt && coupon.startsAt > now) throw new Error('This discount code is not active yet.')
  if (coupon.expiresAt && coupon.expiresAt < now) throw new Error('This discount code has expired.')
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) throw new Error('This discount code has reached its usage limit.')
  if (coupon.minimumOrder !== null && subtotal < coupon.minimumOrder) {
    throw new Error(`Add at least R ${coupon.minimumOrder.toLocaleString('en-ZA')} in products to use this code.`)
  }

  const rawDiscount = coupon.discountType === 'percentage'
    ? subtotal * coupon.value / 100
    : coupon.value
  return Math.min(subtotal, Math.max(0, Math.round(rawDiscount * 100) / 100))
}
