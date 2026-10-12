
import { PrismaClient } from '@prisma/client'
import { mkdirSync, writeFileSync } from 'node:fs'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const blank = v => v == null || (typeof v === 'string' && !v.trim())

function inferModel(p) {
  const t = `${p.name || ''} ${p.description || ''}`
  const patterns = [
    /\b(ThinkPad\s+[A-Z]?\d{1,3}(?:\s+Gen\s*\d+)?)\b/i,
    /\b(OptiPlex\s+\d{4}(?:\s+All-in-One)?)\b/i,
    /\b(Latitude\s+\d{4})\b/i,
    /\b(Precision\s+\d{4})\b/i,
    /\b(Pro\s+Premium\s+PA\d{5}|Pro\s+\d{1,2}\s+PC\d{5})\b/i,
    /\b(EliteBook\s+\d+\s+G\d+i?\s+\d{2}|EliteBook\s+\d+\s+G\d+i?)\b/i,
    /\b(OMEN\s+\d{2})\b/i,
    /\b(Stealth\s+GS\d{2}\s+\d{3,4}[A-Z]{0,2})\b/i,
    /\b(MacBook\s+(?:Pro|Air)\s+\d{1,2}(?:\.\d)?(?:-inch)?)\b/i,
    /\b(Alienware\s+\d{1,2}\s+R\d+)\b/i,
    /\b(V\d{3}-\d{2}[A-Z]{3})\b/i,
    /\b(WF-1000XM\d+|MP\d{2})\b/i
  ]
  for (const re of patterns) {
    const m = t.match(re)
    if (m) return m[1].replace(/\s+/g, ' ').trim()
  }
  return null
}

function extract(p, field) {
  const t = `${p.name || ''}\n${p.description || ''}`
  if (field === 'ram') {
    const m = t.match(/\b(\d{1,3}\s?GB\s*(?:DDR[345]\w*|LPDDR[345]\w*|unified memory|RAM|memory))\b/i)
      || t.match(/\b(\d{1,3}\s?GB\s+(?:RAM|Memory|Unified Memory))\b/i)
    return m?.[1]?.trim() || null
  }
  if (field === 'storage') {
    const m = t.match(/\b(\d+(?:\.\d+)?\s?(?:TB|GB)\s*(?:M\.2\s*)?(?:PCIe\s*)?(?:NVMe\s*)?(?:SSD|Solid State Drive|storage))\b/i)
    return m?.[1]?.replace(/\s+/g, ' ').trim() || null
  }
  if (field === 'gpu') {
    const patterns = [
      /\b((?:NVIDIA\s+)?GeForce\s+(?:RTX|GTX)\s*[\w -]+?(?:\s+\d+GB)?)(?=[,.;\n\r]|$)/i,
      /\b(NVIDIA\s+RTX\s+\d+\s+Ada(?:\s+\d+GB)?)/i,
      /\b((?:Intel\s+)?(?:Iris Xe|Arc Graphics|UHD Graphics\s*\d*|Intel Graphics))\b/i,
      /\b(AMD\s+Radeon\s+[\w ]+?Graphics)\b/i,
      /\b(Quadro\s+[\w ]+?\d+GB)\b/i,
      /\b(RTX\s+(?:PRO\s+)?\d{3,4}(?:\s+\w+)?(?:\s+\d+GB)?|RTX\s+A\d{3,4}(?:\s+\d+GB)?)\b/i
    ]
    for (const re of patterns) {
      const m = t.match(re)
      if (m) return m[1].trim()
    }
    return null
  }
  if (field === 'warranty') {
    const expiry = t.match(/\b(?:warranty valid until|warranty until|warranty expires on)\s*:?\s*([^\n.;]+)/i)
    if (expiry) return `Warranty until ${expiry[1].trim()}`
    const duration = t.match(/\b(\d+\s*[- ]?\s*(?:months?|years?)\s+warranty)\b/i)
    if (duration) return duration[1].replace(/\s+/g, ' ').trim()
    return null
  }
  return null
}

function inferCategory(p) {
  const t = `${p.name || ''} ${p.description || ''}`.toLowerCase()
  if (/earbuds?|earphones?|headphones?|smartwatch|power supply|\bpsu\b|mouse|keyboard|adapter|charger|accessor|portable ups/.test(t)) return 'Accessories & Components'
  if (/desktop|optiplex|all-in-one|tower pc|mini desktop|mini pc/.test(t)) return 'Desktop Computers'
  if (/macbook|imac|ipad|apple/.test(t)) return 'Apple Products'
  if (/gaming|geforce|rtx\s?\d|gtx\s?\d|alienware|omen|stealth gs/.test(t)) return 'Gaming Laptops'
  if (/laptop|notebook|thinkpad|latitude|precision|elitebook|pro\s+\d{1,2}/.test(t)) return 'Business Notebooks'
  return null
}

try {
  const products = await prisma.product.findMany({ orderBy: { stockNumber: 'asc' } })
  const changes = []

  for (const p of products) {
    const data = {}
    const setIfBlank = (field, value) => {
      if (blank(p[field]) && !blank(value)) data[field] = value
    }

if (p.stockNumber === 'LAP1674' &&
        /Lenovo\s+L15/i.test(p.name || '') &&
        /ThinkPad\s+L15/i.test(p.description || '') &&
        p.brand !== 'Lenovo') {
      data.brand = 'Lenovo'
    }

    setIfBlank('model', inferModel(p))
    setIfBlank('category', inferCategory(p))
    setIfBlank('ram', extract(p, 'ram'))
    setIfBlank('storage', extract(p, 'storage'))
    setIfBlank('gpu', extract(p, 'gpu'))
    setIfBlank('warranty', extract(p, 'warranty'))

    if (blank(p.retailPrice)) {
  const retailMatches = [
    ...(p.name || '').matchAll(/\bretail(?:s)?(?:\s+for)?\s*:?\s*R\s*([\d,]+(?:\.\d{1,2})?)/gi),
    ...(p.description || '').matchAll(/\bretail(?:s)?(?:\s+for)?\s*:?\s*R\s*([\d,]+(?:\.\d{1,2})?)/gi)
  ]
  const match = [...retailMatches][0]
  if (match) {
    const amount = Number(match[1].replace(/,/g, ''))
    if (Number.isFinite(amount) && amount > 0) data.retailPrice = amount
  }
}

    const screenText = `${p.screen || ''} ${p.name || ''} ${p.description || ''}`
    if (blank(p.screenSize)) {
      const m = screenText.match(/\b(\d{1,2}(?:\.\d)?)\s*(?:-?\s*inch(?:es)?|["”])/i)
      if (m && Number(m[1]) >= 7 && Number(m[1]) <= 30) {
        data.screenSize = Number(m[1])
      }
    }

    if (blank(p.screen) && (data.screenSize || p.screenSize)) {
      data.screen = `${data.screenSize || p.screenSize}-inch display`
    }

    if (blank(p.hasNumpad)) {
      if (/numeric keypad|number pad|numpad/i.test(p.description || '')) {
        data.hasNumpad = true
      } else if (/no numeric keypad|without (?:a )?(?:numeric keypad|numpad)/i.test(p.description || '')) {
        data.hasNumpad = false
      }
    }

    if (Object.keys(data).length) {
      changes.push({
        stockNumber: p.stockNumber,
        name: p.name,
        changes: data
      })
    }
  }

  mkdirSync('data', { recursive: true })
  writeFileSync(
    'data/product-correction-preview.json',
    JSON.stringify({
      mode: apply ? 'APPLY' : 'DRY RUN',
      productsChecked: products.length,
      productsWithChanges: changes.length,
      changes
    }, null, 2)
  )

  console.log(`Products checked: ${products.length}`)
  console.log(`Products with proposed changes: ${changes.length}`)
  console.log('Report: data/product-correction-preview.json')

  if (!apply) {
    console.log('DRY RUN ONLY. Database was not changed.')
    console.log('Review the report before applying any updates.')
  } else {
    for (const item of changes) {
      const product = products.find(p => p.stockNumber === item.stockNumber)
      if (product) {
        await prisma.product.update({
          where: { id: product.id },
          data: item.changes
        })
      }
    }
    console.log(`Applied changes to ${changes.length} products.`)
  }
} finally {
  await prisma.$disconnect()
}
