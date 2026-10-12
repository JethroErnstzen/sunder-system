import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createPasswordResetToken } from '@/lib/customer-auth'
import { assertCustomerEmailConfigured, sendPasswordResetEmail } from '@/lib/customer-email'
import { prisma } from '@/lib/prisma'

const requestSchema = z.object({ email: z.string().trim().email().max(254) })
const GENERIC_MESSAGE = 'If an account exists for that email, we will send a password setup link shortly.'
const RESET_TOKEN_LIFETIME_MS = 30 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })

  let baseUrl: string
  try {
    baseUrl = assertCustomerEmailConfigured()
  } catch (error) {
    console.error('Customer password setup email is not configured:', error)
    return NextResponse.json({ error: 'Password setup email is temporarily unavailable. Please contact sales@sunder.co.za.' }, { status: 503 })
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      select: { id: true, email: true },
    })
    if (!customer) return NextResponse.json({ message: GENERIC_MESSAGE })

    const recentToken = await prisma.customerResetToken.findFirst({
      where: {
        customerId: customer.id,
        createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
      },
      select: { id: true },
    })
    if (recentToken) return NextResponse.json({ message: GENERIC_MESSAGE })

    const { token, tokenHash } = createPasswordResetToken()
    await prisma.$transaction([
      prisma.customerResetToken.deleteMany({ where: { customerId: customer.id } }),
      prisma.customerResetToken.create({
        data: {
          customerId: customer.id,
          tokenHash,
          expiresAt: new Date(Date.now() + RESET_TOKEN_LIFETIME_MS),
        },
      }),
    ])

    const resetUrl = new URL('/reset-password', baseUrl)
    resetUrl.searchParams.set('token', token)
    try {
      await sendPasswordResetEmail(customer.email, resetUrl.toString())
    } catch (error) {
      await prisma.customerResetToken.deleteMany({ where: { tokenHash } })
      console.error('Could not send customer password setup email:', error)
      return NextResponse.json({ error: 'Password setup email is temporarily unavailable. Please contact sales@sunder.co.za.' }, { status: 503 })
    }

    return NextResponse.json({ message: GENERIC_MESSAGE })
  } catch (error) {
    console.error('Customer password setup request failed:', error)
    return NextResponse.json({ error: 'Unable to request a password setup link right now.' }, { status: 500 })
  }
}
