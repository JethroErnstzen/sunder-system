import fs from 'node:fs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(field)
      if (row.some((value) => value.trim())) rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  row.push(field)
  if (row.some((value) => value.trim())) rows.push(row)

  if (quoted) throw new Error('The customer CSV contains an unterminated quoted field.')
  return rows
}

async function main() {
  const filePath = process.argv[2]
  if (!filePath) throw new Error('Usage: node scripts/import-woocommerce-customers.mjs <customers.csv>')

  const rows = parseCsv(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''))
  const headers = rows.shift()?.map((header) => header.trim().toLowerCase()) || []
  const emailIndex = headers.indexOf('email')
  const nameIndex = headers.indexOf('name')
  const phoneIndex = headers.indexOf('billing phone')
  if (emailIndex < 0) throw new Error('The CSV must include an Email column.')

  const customers = new Map()
  let skipped = 0
  for (const row of rows) {
    const email = (row[emailIndex] || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      skipped += 1
      continue
    }
    const fullName = nameIndex >= 0 ? row[nameIndex]?.trim() || null : null
    const phone = phoneIndex >= 0 ? row[phoneIndex]?.trim() || null : null
    if (!customers.has(email)) customers.set(email, { fullName, phone })
  }

  let imported = 0
  for (const [email, { fullName, phone }] of customers) {
    await prisma.customer.upsert({
      where: { email },
      update: {
        ...(fullName ? { fullName } : {}),
        ...(phone ? { phone } : {}),
        source: 'woocommerce',
      },
      create: {
        email,
        fullName,
        phone,
        source: 'woocommerce',
      },
    })
    imported += 1
  }

  console.log(`Imported or updated ${imported} customer accounts. Skipped ${skipped} rows with invalid email addresses.`)
  console.log('No passwords, customer addresses, order totals, or historical orders were imported.')
}

main()
  .catch((error) => {
    console.error('Customer import failed:', error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
