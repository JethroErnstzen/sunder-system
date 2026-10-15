import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendEmail } from '@/lib/customer-email'

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  contact: z.string().trim().min(3).max(254),
  message: z.string().trim().min(3).max(5000),
})

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const isSouthAfricanPhone = (value: string) => /^(?:0\d{9}|\+?27\d{9})$/.test(value.replace(/[\s().-]/g, ''))

export async function POST(request: Request) {
  const parsed = contactSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter your name, a valid email address or South African phone number, and a message.' }, { status: 400 })
  }

  const { name, contact, message } = parsed.data
  const emailContact = isEmail(contact)
  if (!emailContact && !isSouthAfricanPhone(contact)) {
    return NextResponse.json({ error: 'Enter a valid email address or a South African phone number with 10 digits.' }, { status: 400 })
  }

  try {
    const safeName = name.replace(/[\r\n]+/g, ' ')
    await sendEmail({
      to: 'sales@sunder.co.za',
      ...(emailContact ? { replyTo: contact } : {}),
      subject: `Website enquiry from ${safeName}`,
      text: `A new message was sent through the Sunder Computers contact page.\n\nName: ${safeName}\nReply to: ${contact}\n\nMessage:\n${message}`,
    })
    return NextResponse.json({ ok: true, message: 'Your message has been sent to sales@sunder.co.za. We’ll get back to you as soon as we can.' })
  } catch (error) {
    console.error('Contact page email failed:', error)
    return NextResponse.json({ error: 'We could not send your message right now. Please try WhatsApp or contact sales@sunder.co.za.' }, { status: 503 })
  }
}
