import { NextResponse } from 'next/server'
import { z } from 'zod'
import { CUSTOMER_COOKIE, createCustomerSession, customerCookieOptions, hashCustomerPassword } from '@/lib/customer-auth'
import { sendNewAccountAlert } from '@/lib/customer-email'
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
    // Check session signing configuration before creating a permanent customer
    // record. Otherwise a missing secret leaves a password-bearing account that
    // the customer cannot sign into after signup returns an error.
    createCustomerSession('session-configuration-check', 0)

    const existing = await prisma.customer.findUnique({
      where: { email },
      select: { passwordHash: true },
    })
    if (existing) {
      return NextResponse.json({
        error: existing.passwordHash
          ? 'An account with this email already exists. Sign in or request a password setup link.'
          : 'We found a customer record for this email from a previous order. Use “Already shopped with Sunder?” to request a secure password setup link and access your order history.',
      }, { status: 409 })
    }

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
      select: { id: true, sessionVersion: true, createdAt: true },
    })

    try {
      await sendNewAccountAlert({ fullName: values.fullName, email, phone: values.phone, createdAt: customer.createdAt })
    } catch (error) {
      console.error('New account notification email failed:', error)
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(CUSTOMER_COOKIE, createCustomerSession(customer.id, customer.sessionVersion), customerCookieOptions())
    return response
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'An account with this email already exists. Sign in or request a password setup link.' }, { status: 409 })
    }
    console.error('Customer sign-up failed:', error)
    if (error instanceof Error && error.message === 'CUSTOMER_SESSION_SECRET is not configured.') {
      return NextResponse.json({ error: 'Account creation is unavailable because account security is not configured on the server. Please contact sales@sunder.co.za.' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Unable to create your account right now. Please try again.' }, { status: 500 })
  }
}
