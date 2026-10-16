import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`
}

export async function GET() {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subscribers = await prisma.subscriber.findMany({ orderBy: { createdAt: 'desc' } })
  const rows = [
    ['Email', 'Subscribed at', 'Source', 'Consent recorded at'],
    ...subscribers.map((subscriber) => [
      subscriber.email,
      subscriber.createdAt.toISOString(),
      subscriber.source,
      subscriber.consentAt.toISOString(),
    ]),
  ]
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sunder-subscribers.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
