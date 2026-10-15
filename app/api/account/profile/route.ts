import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentCustomer } from '@/lib/customer-auth'
import { prisma } from '@/lib/prisma'

const addressSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1).max(40),
  recipientName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  addressLine1: z.string().trim().min(3).max(200),
  suburb: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(3).max(20),
  isDefault: z.boolean(),
})

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  addresses: z.array(addressSchema).min(1).max(20),
}).superRefine((values, context) => {
  if (values.addresses.filter((address) => address.isDefault).length !== 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['addresses'], message: 'Choose one default address.' })
  }
})

export async function GET() {
  const customer = await getCurrentCustomer()
  if (!customer) return NextResponse.json({ error: 'Sign in to load saved account details.' }, { status: 401 })

  return NextResponse.json({
    email: customer.email,
    fullName: customer.fullName,
    phone: customer.phone,
    addresses: customer.addresses,
  })
}

export async function PATCH(request: Request) {
  const customer = await getCurrentCustomer()
  if (!customer) return NextResponse.json({ error: 'Sign in to update your account details.' }, { status: 401 })

  const parsed = profileSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Check your details and try again.' }, { status: 400 })
  }

  try {
    const { fullName, phone, addresses } = parsed.data
    const savedAddresses = await prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: customer.id },
        data: { fullName, phone },
      })

      const retainedIds = addresses.flatMap((address) => address.id ? [address.id] : [])
      await tx.customerAddress.deleteMany({
        where: {
          customerId: customer.id,
          ...(retainedIds.length ? { id: { notIn: retainedIds } } : {}),
        },
      })

      for (const address of addresses) {
        const { id, ...data } = address
        if (id) {
          const updated = await tx.customerAddress.updateMany({
            where: { id, customerId: customer.id },
            data,
          })
          if (updated.count !== 1) throw new Error('A saved address could not be found.')
        } else {
          await tx.customerAddress.create({ data: { ...data, customerId: customer.id } })
        }
      }
      return tx.customerAddress.findMany({
        where: { customerId: customer.id },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      })
    })
    return NextResponse.json({ ok: true, addresses: savedAddresses })
  } catch (error) {
    console.error('Customer profile update failed:', error)
    return NextResponse.json({ error: 'Unable to save your details right now. Please try again.' }, { status: 500 })
  }
}
