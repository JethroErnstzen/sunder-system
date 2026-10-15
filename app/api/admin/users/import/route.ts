import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { parseCustomerImportCsv } from '@/lib/customer-import'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
const MAX_FILE_BYTES = 2 * 1024 * 1024

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const intent = formData.get('intent')
    if (!(file instanceof File) || !file.size) return NextResponse.json({ error: 'Choose a CSV file first.' }, { status: 400 })
    if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: 'The CSV must be 2 MB or smaller.' }, { status: 413 })
    if (!file.name.toLowerCase().endsWith('.csv')) return NextResponse.json({ error: 'Upload a .csv file.' }, { status: 400 })

    const parsed = parseCustomerImportCsv(await file.text())
    if (!parsed.rows.length) return NextResponse.json({ error: 'No valid customer or subscriber email addresses were found.' }, { status: 400 })

    if (intent === 'preview') {
      return NextResponse.json({
        eligible: parsed.rows.length,
        invalid: parsed.invalidCount,
        duplicates: parsed.duplicateCount,
        excludedRoles: parsed.excludedRoleCount,
      })
    }
    if (intent !== 'import') return NextResponse.json({ error: 'Choose preview or import.' }, { status: 400 })

    const result = await prisma.$transaction(async (tx) => {
      let created = 0
      let matched = 0
      let profileDetailsAdded = 0

      for (const customer of parsed.rows) {
        const existing = await tx.customer.findUnique({
          where: { email: customer.email },
          select: { id: true, fullName: true, phone: true, passwordHash: true, source: true },
        })

        if (!existing) {
          await tx.customer.create({
            data: {
              email: customer.email,
              fullName: customer.fullName,
              phone: customer.phone,
              source: 'woocommerce',
            },
          })
          created += 1
          continue
        }

        matched += 1
        const data: { fullName?: string; phone?: string; source?: string } = {}
        if (!existing.fullName && customer.fullName) data.fullName = customer.fullName
        if (!existing.phone && customer.phone) data.phone = customer.phone
        if (!existing.passwordHash && existing.source !== 'woocommerce') data.source = 'woocommerce'
        if (Object.keys(data).length) {
          await tx.customer.update({ where: { id: existing.id }, data })
          profileDetailsAdded += 1
        }
      }

      return { created, matched, profileDetailsAdded }
    }, { timeout: 30_000 })

    return NextResponse.json({ ...result, ...{
      invalid: parsed.invalidCount,
      duplicates: parsed.duplicateCount,
      excludedRoles: parsed.excludedRoleCount,
    } })
  } catch (error) {
    console.error('Customer CSV import failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to import the customer CSV.' }, { status: 400 })
  }
}
