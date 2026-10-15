import { NextResponse } from 'next/server'
import { getCurrentCustomer } from '@/lib/customer-auth'

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
