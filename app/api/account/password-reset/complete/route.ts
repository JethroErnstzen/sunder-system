import { NextResponse } from 'next/server'
import { z } from 'zod'
import { CUSTOMER_COOKIE, createCustomerSession, customerCookieOptions, hashCustomerPassword, hashPasswordResetToken } from '@/lib/customer-auth'
import { prisma } from '@/lib/prisma'

const completeSchema = z.object({
  token: z.string().min(32).max(128),
  password: z.string().min(12).max(200),
})

export async function POST(request: Request) {
  const parsed = completeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Use a valid setup link and a password with at least 12 characters.' }, { status: 400 })

  try {
    const tokenHash = hashPasswordResetToken(parsed.data.token)
    const passwordHash = await hashCustomerPassword(parsed.data.password)
    const customerId = await prisma.$transaction(async (tx) => {
      const reset = await tx.customerResetToken.findUnique({ where: { tokenHash } })
      if (!reset || reset.expiresAt <= new Date()) return null

      const customer = await tx.customer.findUnique({
        where: { id: reset.customerId },
        select: { sessionVersion: true },
      })
      if (!customer) return null
      const sessionVersion = customer.sessionVersion + 1
      const session = createCustomerSession(reset.customerId, sessionVersion)
      await tx.customer.update({
        where: { id: reset.customerId },
        data: { passwordHash, sessionVersion },
      })
      await tx.customerResetToken.deleteMany({ where: { customerId: reset.customerId } })
      return { id: reset.customerId, session }
    })
    if (!customerId) return NextResponse.json({ error: 'This password setup link has expired or was already used. Request a new link.' }, { status: 400 })

    const response = NextResponse.json({ ok: true })
    response.cookies.set(CUSTOMER_COOKIE, customerId.session, customerCookieOptions())
    return response
  } catch (error) {
    console.error('Customer password setup failed:', error)
    return NextResponse.json({ error: 'Unable to set your password right now. Please request a new link and try again.' }, { status: 500 })
  }
}
