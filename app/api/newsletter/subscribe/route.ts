import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const subscribeSchema = z.object({
  email: z.string().trim().email().max(254),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
})

export async function POST(request: Request) {
  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email address and confirm that you want to receive newsletter and special-offer emails.' }, { status: 400 })
  }

  // Quietly accept bot submissions to the hidden honeypot without storing them.
  if (parsed.data.website) return NextResponse.json({ ok: true })

  try {
    await prisma.subscriber.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        source: 'website',
      },
    })
    return NextResponse.json({ ok: true, message: 'You’re subscribed. Watch your inbox for Sunder specials.' }, { status: 201 })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ ok: true, message: 'That email address is already subscribed.' })
    }
    console.error('Newsletter subscription failed:', error)
    return NextResponse.json({ error: 'We could not save your subscription right now. Please try again shortly.' }, { status: 503 })
  }
}
