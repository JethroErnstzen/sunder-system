
import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'node:fs'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const blank = (v) =>
  v === null || v === undefined ||
  (typeof v === 'string' && !v.trim())

function clean(value) {
  return typeof value === 'string'
    ? value.replace(/&amp;/g, '&').trim()
    : value
}


function cleanProductTitle(name) {
  if (!name) return name

  let title = String(name)
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/[–—]/g, '-')
    .trim()

  // Remove retail price and warranty notes at the end of titles.
  title = title.replace(
    /\s*[-–—,|]*\s*(?:retail\s*:\s*R\s*[\d,.]+k?|retails?\s+(?:for\s+)?R\s*[\d,.]+k?|warranty(?:\s+.*)?|with warranty)\s*$/i,
    ''
  ).trim()

  // Remove condition/status wording at the end.
  title = title.replace(
    /\s*[-–—,|]*\s*(?:(?:excellent|immaculate|very good|good|fair)\s+condition|excellent|immaculate|as new|demo(?:\s+unit)?|brand new(?:\s*,?\s*sealed)?|new(?:\s*\/\s*sealed)?|pre-owned|refurbished|\d+\s*[- ]?year\s+warranty)\s*$/i,
    ''
  ).trim()

  // Remove trailing warranty/status wording that follows a specifications bracket.
  const closingBracket = title.lastIndexOf(']')
  if (closingBracket !== -1) {
    const suffix = title.slice(closingBracket + 1)
    if (/^\s*(?:[-,|]\s*)?(?:excellent|immaculate|very good|good|fair|as new|demo|brand new|new|pre-owned|refurbished|\d+\s*[- ]?year\s+warranty|warranty)\b/i.test(suffix)) {
      title = title.slice(0, closingBracket + 1).trim()
    }
  }

  return title.replace(/\s+/g, ' ').trim()
}


function inferModel(p) {
  const text = `${p.name || ''} ${p.description || ''}`
  const patterns = [
    /\b(ThinkPad\s+[A-Z]?\d{1,3}(?:\s+Gen\s*\d+)?|ThinkPad\s+[A-Z]\d{1,2}\s+Gen\s*\d+)\b/i,
    /\b(OptiPlex\s+\d{4}(?:\s+All-in-One)?)\b/i,
    /\b(Latitude\s+\d{4})\b/i,
    /\b(Precision\s+\d{4})\b/i,
    /\b(Pro\s+Premium\s+PA\d{5}|Pro\s+Max\s+\d{1,2}\s+MC\d{5}|Pro\s+\d{1,2}\s+PC\d{5})\b/i,
    /\b(EliteBook\s+\d+\s+G\d+i?\s+\d{2}|EliteBook\s+\d+\s+G\d+i?)\b/i,
    /\b(OMEN\s+\d{2})\b/i,
    /\b(ProArt\s+P\d{2})\b/i,
    /\b(Stealth\s+GS\d{2}\s+\d{3,4}[A-Z]{0,2})\b/i,
    /\b(MacBook\s+(?:Pro|Air)\s+\d{1,2}(?:\.\d)?(?:-inch)?)\b/i,
    /\b(Alienware\s+\d{1,2}\s+R\d+)\b/i,
    /\b(V\d{3}-\d{2}[A-Z]{3})\b/i,
    /\b(WF-1000XM\d+)\b/i,
    /\b(MP\d{2})\b/i,
  ]

  for (const re of patterns) {
    const match = text.match(re)
    if (match) return match[1].replace(/\s+/g, ' ').trim()
  }

  // Specific models not covered by the general patterns.
  const special = [
    [/\bLenovo\s+L15\s+Gen\s*4\b/i, 'ThinkPad L15 Gen 4'],
    [/\bLenovo\s+E14\s+Gen\s*5\b/i, 'ThinkPad E14 Gen 5'],
    [/\bLenovo\s+L14\s+Gen\s*5\b/i, 'ThinkPad L14 Gen 5'],
    [/\bBlackview\s+MP60\b/i, 'MP60'],
    [/\bDell\s+13\s+Pro\s+Premium\s+PA13250\b/i, 'Pro Premium PA13250'],
  ]

  for (const [re, model] of special) {
    if (re.test(text)) return model
  }

  return null
}

function extractRAM(p) {
  const text = `${p.name || ''}\n${p.description || ''}`

  const match =
    text.match(/\b(\d{1,3})\s*GB\s+(?:DDR[345]\w*\s+)?(?:RAM|memory|unified memory)\b/i) ||
    text.match(/\b(\d{1,3})\s*GB\s*(?:DDR[345]\w*|LPDDR[345]\w*)\b/i) ||
    text.match(/\[\s*\d{1,3}\s*GB\s*\|\s*(\d{1,3})\s*GB\b/i)

  if (!match) return null

  // Preserve the product's memory terminology when the source specifies it.
  const surrounding = text.slice(
    Math.max(0, match.index - 20),
    Math.min(text.length, match.index + match[0].length + 30)
  )

  if (/unified memory/i.test(surrounding)) {
    return `${match[1]}GB Unified Memory`
  }

  return `${match[1]}GB RAM`
}

function extractStorage(p) {
  const text = `${p.name || ''}\n${p.description || ''}`

  const match = text.match(
    /\b(\d+(?:\.\d+)?\s*(?:TB|GB))\s*(?:(?:M\.2|PCIe|NVMe)\s*)?(?:SSD|solid state drive)\b/i
  )

  if (match) return `${match[1].replace(/\s+/g, '')} SSD`

  const bracket = (p.name || '').match(
    /\[\s*[^|\]]+\s*\|\s*\d+\s*GB\s*\|\s*(\d+(?:\.\d+)?\s*(?:TB|GB))(?:\s+SSD)?/i
  )

  if (bracket) return `${bracket[1].replace(/\s+/g, '')} SSD`

  return null
}


function extractGPU(p) {
  const text = `${p.name || ''}\n${p.description || ''}`

  const patterns = [
    // NVIDIA RTX PRO and workstation GPUs
    /\b(NVIDIA\s+RTX\s+PRO\s+\d+\s+\d+\s*GB)\b/i,
    /\b(RTX\s+PRO\s+\d+\s+\d+\s*GB)\b/i,
    /\b(RTX\s+A\d{3,4}\s+\d+\s*GB)\b/i,

    // GeForce GPUs: match the memory size before the general model pattern
    /\b(NVIDIA\s+GeForce\s+(?:RTX|GTX)\s*\d{3,4}(?:\s*(?:Ti|SUPER))?\s+\d+\s*GB(?:\s+GDDR[56X]+)?(?:\s+Graphics)?)\b/i,
    /\b(NVIDIA\s+GeForce\s+(?:RTX|GTX)\s*\d{3,4}(?:\s*(?:Ti|SUPER))?(?:\s+GDDR[56X]+)?(?:\s+Graphics)?)\b/i,

    // RTX models without the NVIDIA GeForce prefix
    /\b(RTX\s+\d{3,4}(?:\s*(?:Ti|SUPER))?\s+\d+\s*GB)\b/i,
    /\b(RTX\s+\d{3,4}(?:\s*(?:Ti|SUPER))?)\b/i,

    // Other workstation graphics
    /\b(Quadro\s+\w+\s+\d+\s*GB)\b/i,

    // Integrated graphics
    /\b(Intel\s+Iris\s+Xe(?:\s+Graphics)?)\b/i,
    /\b(Intel\s+UHD\s+Graphics(?:\s+\d+)?)\b/i,
    /\b(AMD\s+Radeon\s+RX\s+\w+(?:\s+\d+\s*GB)?)\b/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1].replace(/\s+/g, ' ').trim()
    }
  }

  return null
}


function extractCPU(p) {
  const text = `${p.name || ''}\n${p.description || ''}`

  const patterns = [
    /\b(Intel\s+Core\s+Ultra\s+[3579]\s+\d{3}[A-Z]{0,3})\b/i,
    /\b(Core\s+Ultra\s+[3579]\s+\d{3}[A-Z]{0,3})\b/i,
    /\b(Intel\s+Core\s+i[3579]-\d{4,5}[A-Z]{0,3})\b/i,
    /\b(i[3579]-\d{4,5}[A-Z]{0,3})\b/i,
    /\b(AMD\s+Ryzen\s+AI\s+\d+\s+HX\s+\d{3})\b/i,
    /\b(Ryzen\s+[3579]\s+\d{4,5}[A-Z]{0,3})\b/i,
    /\b(Celeron\s+N\d{4})\b/i,
    /\b(Apple\s+M[1-5](?:\s+(?:Pro|Max|Ultra))?)\b/i,
  ]

  for (const re of patterns) {
    const match = text.match(re)
    if (match) return match[1].replace(/\s+/g, ' ').trim()
  }

  return null
}

function extractWarranty(p) {
  const text = `${p.name || ''}\n${p.description || ''}`

  const expiry = text.match(
    /(?:warranty until|warranty valid until|warranty expires(?: on)?)\s+(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i
  )

  if (expiry) return `Warranty until ${expiry[1]}`

  const duration = text.match(
    /\b(\d+\s*[- ]?\s*(?:month|year)s?\s+warranty)\b/i
  )

  if (duration) return duration[1].replace(/\s+/g, ' ')

  return null
}

function extractRetailPrice(p) {
  const text = `${p.name || ''}\n${p.description || ''}`

  const patterns = [
    /\bretails?\s+(?:for\s+)?R\s*([\d,]+(?:\.\d{1,2})?)\s*(k)?\b/i,
    /\bretail\s*:\s*R\s*([\d,]+(?:\.\d{1,2})?)\s*(k)?\b/i,
    /\baverage retail\s*:?\s*R\s*([\d,]+(?:\.\d{1,2})?)\s*(k)?\b/i,
  ]

  for (const re of patterns) {
    const match = text.match(re)
    if (!match) continue

    let amount = Number(match[1].replace(/,/g, ''))
    if (match[2]) amount *= 1000

    if (Number.isFinite(amount) && amount > 0) return Math.round(amount)
  }

  return null
}

function extractScreenSize(p) {
  const text = `${p.name || ''}\n${p.description || ''}`
  const match = text.match(
    /\b(\d{1,2}(?:\.\d)?)\s*[- ]?(?:inch|inches|["”])\b/i
  )

  if (!match) return null

  const size = Number(match[1])
  return size >= 7 && size <= 30 ? size : null
}

function inferCategory(p) {
  const text = `${p.name || ''} ${p.description || ''}`.toLowerCase()

  if (/earbuds?|earphones?|headphones?|watch|power supply|\bpsu\b|mouse|keyboard|adapter|charger|accessor|ups\b/.test(text)) {
    return 'Accessories & Components'
  }
  if (/desktop|optiplex|all-in-one|tower pc|mini desktop|mini pc/.test(text)) {
    return 'Desktop Computers'
  }
  if (/macbook|imac|apple/.test(text)) return 'Apple Products'
  if (/gaming|geforce|rtx\s?\d|gtx\s?\d|alienware|omen|stealth gs/.test(text)) {
    return 'Gaming Laptops'
  }
  if (/laptop|notebook|thinkpad|latitude|precision|elitebook|pro\s+\d{1,2}/.test(text)) {
    return 'Business Notebooks'
  }

  return null
}

function extractNumpad(p) {
  const text = `${p.name || ''}\n${p.description || ''}`

  if (/without (?:a )?(?:numeric keypad|number pad|numpad)|no numeric keypad|does not have (?:a )?(?:numeric keypad|numpad)/i.test(text)) {
    return false
  }

  if (/numeric keypad|number pad|numpad|full[- ]size keyboard with numeric/i.test(text)) {
    return true
  }

  return null
}

const products = await prisma.product.findMany({
  include: { images: true, retailListings: true },
  orderBy: { stockNumber: 'asc' },
})

const updates = []
const report = []

for (const p of products) {
  const data = {}
  const before = {}

  const addIfBlank = (field, value) => {
    if (blank(p[field]) && !blank(value)) {
      data[field] = value
      before[field] = p[field]
    }
  }

  // Clean condition/status wording from the product title.
  const cleanedTitle = cleanProductTitle(p.name)
  if (cleanedTitle !== p.name) {
    data.name = cleanedTitle
    before.name = p.name
  }

  // Correct this known brand error only when the description supports it.
  if (
    p.stockNumber === 'LAP1674' &&
    /Lenovo\s+L15/i.test(p.name || '') &&
    /ThinkPad\s+L15/i.test(p.description || '') &&
    p.brand !== 'Lenovo'
  ) {
    data.brand = 'Lenovo'
    before.brand = p.brand
  }

  addIfBlank('model', inferModel(p))
  addIfBlank('category', inferCategory(p))
  addIfBlank('cpu', extractCPU(p))
  addIfBlank('ram', extractRAM(p))
  addIfBlank('storage', extractStorage(p))
  addIfBlank('gpu', extractGPU(p))
  addIfBlank('warranty', extractWarranty(p))
  addIfBlank('retailPrice', extractRetailPrice(p))
  addIfBlank('screenSize', extractScreenSize(p))
  addIfBlank('hasNumpad', extractNumpad(p))

  // Only fill screen text when the size is actually supported by the source.
  const screenSize = data.screenSize ?? p.screenSize
  if (blank(p.screen) && !blank(screenSize)) {
    data.screen = `${screenSize}-inch display`
    before.screen = p.screen
  }

  const cleanedCategory = clean(p.category)
  if (cleanedCategory !== p.category && !Object.hasOwn(data, 'category')) {
    data.category = cleanedCategory
    before.category = p.category
  }

  if (Object.keys(data).length) {
    updates.push({
      id: p.id,
      stockNumber: p.stockNumber,
      name: p.name,
      data,
    })

    report.push({
      stockNumber: p.stockNumber,
      name: p.name,
      changes: data,
      previous: before,
    })
  }
}

writeFileSync(
  'data/product-correction-preview.json',
  JSON.stringify(
    {
      mode: apply ? 'APPLY' : 'DRY RUN',
      totalProducts: products.length,
      productsWithProposedChanges: updates.length,
      changes: report,
    },
    null,
    2
  )
)

console.log(`Products checked: ${products.length}`)
console.log(`Products with proposed changes: ${updates.length}`)
console.log('Preview: data/product-correction-preview.json')

if (!apply) {
  console.log('DRY RUN ONLY. No database changes were made.')
  console.log('Review the preview before rerunning with --apply.')
} else {
  let count = 0

  for (const item of updates) {
    await prisma.product.update({
      where: { id: item.id },
      data: item.data,
    })
    count++
  }

  console.log(`Updated ${count} products.`)
}

await prisma.$disconnect()
