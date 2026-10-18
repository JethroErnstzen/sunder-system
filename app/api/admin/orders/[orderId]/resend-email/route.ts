import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { sendOrderEmails } from '@/lib/order-emails'

export async function POST(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Admin sign-in is required.' }, { status: 401 })
  }

  try {
    const { orderId } = await params
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { orderBy: { id: 'asc' } } },
    })
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    if (['payflex', 'stitch', 'stitchPayLater'].includes(order.paymentMethod || '') && order.paymentStatus.toLowerCase() !== 'paid') {
      return NextResponse.json({ error: 'The payment provider has not confirmed payment. The invoice and sales alert will be sent after successful payment.' }, { status: 409 })
    }

    const result = await sendOrderEmails(order)
    if (!result.customerEmailSent || !result.adminEmailSent) {
      return NextResponse.json({
        error: 'One or more emails could not be sent.',
        ...result,
      }, { status: 502 })
    }

    return NextResponse.json({ message: 'Invoice and sales alert sent.', ...result })
  } catch (error) {
    console.error('Could not resend order emails:', error)
    return NextResponse.json({ error: 'Unable to resend order emails.' }, { status: 500 })
  }
}
