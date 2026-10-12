import { NextResponse } from 'next/server'
import { z } from 'zod'
import { CUSTOMER_COOKIE, createCustomerSession, customerCookieOptions, verifyCustomerPassword } from '@/lib/customer-auth'
import { prisma } from '@/lib/prisma'

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
})
const DUMMY_PASSWORD_HASH = `scrypt$${Buffer.alloc(16).toString('base64url')}$${Buffer.alloc(64).toString('base64url')}`

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email and password.' }, { status: 400 })

  try {
    const email = parsed.data.email.toLowerCase()
    const customer = await prisma.customer.findUnique({ where: { email } })
    const passwordValid = await verifyCustomerPassword(parsed.data.password, customer?.passwordHash || DUMMY_PASSWORD_HASH)
    if (!customer || !passwordValid) {
      return NextResponse.json({ error: 'Email or password is incorrect. If this is your first time on our new website, request a password setup link.' }, { status: 401 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(CUSTOMER_COOKIE, createCustomerSession(customer.id, customer.sessionVersion), customerCookieOptions())
    return response
  } catch (error) {
    console.error('Customer sign-in failed:', error)
    return NextResponse.json({ error: 'Unable to sign in right now. Please try again later.' }, { status: 500 })
  }
}
