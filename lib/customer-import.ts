export type CustomerImportRow = {
  email: string
  fullName: string | null
  phone: string | null
}

export type CustomerImportParseResult = {
  rows: CustomerImportRow[]
  invalidCount: number
  duplicateCount: number
  excludedRoleCount: number
}

function parseCsv(text: string) {
  const rows: string[][] = []
  let row: string[] = []
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
  if (quoted) throw new Error('The CSV contains an unterminated quoted field.')
  return rows
}

export function parseCustomerImportCsv(text: string): CustomerImportParseResult {
  const table = parseCsv(text.replace(/^\uFEFF/, ''))
  const headers = table.shift()?.map((header) => header.trim().toLowerCase()) || []
  const emailIndex = headers.findIndex((header) => ['email', 'user_email', 'email address'].includes(header))
  const nameIndex = headers.findIndex((header) => ['name', 'display name', 'full name'].includes(header))
  const firstNameIndex = headers.findIndex((header) => ['first name', 'billing first name'].includes(header))
  const lastNameIndex = headers.findIndex((header) => ['last name', 'billing last name'].includes(header))
  const phoneIndex = headers.findIndex((header) => ['billing phone', 'phone', 'phone number'].includes(header))
  const roleIndex = headers.findIndex((header) => ['role', 'roles'].includes(header))
  if (emailIndex < 0) throw new Error('The CSV needs an Email column.')

  const records = new Map<string, CustomerImportRow>()
  let invalidCount = 0
  let duplicateCount = 0
  let excludedRoleCount = 0

  for (const row of table) {
    const role = roleIndex >= 0 ? (row[roleIndex] || '').trim().toLowerCase() : ''
    if (role && !['customer', 'subscriber'].includes(role)) {
      excludedRoleCount += 1
      continue
    }

    const email = (row[emailIndex] || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      invalidCount += 1
      continue
    }
    if (records.has(email)) {
      duplicateCount += 1
      continue
    }

    const firstName = firstNameIndex >= 0 ? (row[firstNameIndex] || '').trim() : ''
    const lastName = lastNameIndex >= 0 ? (row[lastNameIndex] || '').trim() : ''
    const combinedName = [firstName, lastName].filter(Boolean).join(' ')
    const fullName = combinedName || (nameIndex >= 0 ? (row[nameIndex] || '').trim() : '')
    const phone = phoneIndex >= 0 ? (row[phoneIndex] || '').trim() : ''
    records.set(email, { email, fullName: fullName || null, phone: phone || null })
  }

  return { rows: [...records.values()], invalidCount, duplicateCount, excludedRoleCount }
}
