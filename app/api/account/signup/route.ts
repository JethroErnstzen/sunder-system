import { NextResponse } from 'next/server'
import { z } from 'zod'
import { CUSTOMER_COOKIE, createCustomerSession, customerCookieOptions, hashCustomerPassword } from '@/lib/customer-auth'
import { prisma } from '@/lib/prisma'

const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(30),
  password: z.string().min(8).max(200).regex(/[A-Z]/),
  label: z.string().trim().min(1).max(40).default('Home'),
  addressLine1: z.string().trim().min(3).max(200),
  suburb: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(3).max(20),
})

export async function POST(request: Request) {
  const parsed = signupSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Complete all required fields and use a password with at least 8 characters, including one capital letter.' }, { status: 400 })
  }

  try {
    const values = parsed.data
    const email = values.email.toLowerCase()
    const passwordHash = await hashCustomerPassword(values.password)
    const customer = await prisma.customer.create({
      data: {
        email,
        fullName: values.fullName,
        phone: values.phone,
        passwordHash,
        source: 'website',
        addresses: {
          create: {
            label: values.label,
            recipientName: values.fullName,
            phone: values.phone,
            addressLine1: values.addressLine1,
            suburb: values.suburb,
            city: values.city,
            province: values.province,
            postalCode: values.postalCode,
            isDefault: true,
          },
        },
      },
      select: { id: true, sessionVersion: true },
    })

    const response = NextResponse.json({ ok: true })
    response.cookies.set(CUSTOMER_COOKIE, createCustomerSession(customer.id, customer.sessionVersion), customerCookieOptions())
    return response
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'An account with this email already exists. Sign in or request a password setup link.' }, { status: 409 })
    }
    console.error('Customer sign-up failed:', error)
    return NextResponse.json({ error: 'Unable to create your account right now. Please try again.' }, { status: 500 })
  }
}
