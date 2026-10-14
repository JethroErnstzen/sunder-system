import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const catalogUrl = 'https://www.sunder.co.za/wp-json/wc/store/v1/products?per_page=100'

function decodeHtml(value = '') {
  return String(value)
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
}

function plainText(html = '') {
  return decodeHtml(String(html)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ' '))
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function attribute(product, name) {
  const target = name.toLowerCase()
  const match = product.attributes?.find((item) => item.name?.trim().toLowerCase() === target)
  return match?.terms?.map((term) => term.name?.trim()).filter(Boolean).join(', ') || ''
}

function cleanProductName(sourceName) {
  let name = decodeHtml(sourceName).replace(/\s+/g, ' ').trim()
  const trailingNoise = [
    /\s*(?:,|–|—|Ð|-)\s*(?:(?:\d+(?:\.\d+)?\s*)?(?:year|month|yr|mo)s?\s+)?warranty\b.*$/i,
    /\s*(?:,|–|—|Ð|-)\s*(?:excellent|immaculate|good|fair)(?:\s+condition)?\b.*$/i,
    /\s*(?:,|–|—|Ð|-)\s*(?:pre[- ]?owned|demo|brand\s+new|new(?:\/sealed)?|as\s+new)\b.*$/i,
    /\s*(?:,|–|—|Ð|-)\s*(?:retails?\s+for|retail:)\s*R?\s*[\d,.]+.*$/i,
  ]
  let previous
  do {
    previous = name
    for (const pattern of trailingNoise) name = name.replace(pattern, '').trim()
  } while (name !== previous)
  return name.replace(/[\s,–—-]+$/g, '').trim()
}

function numberFromPrice(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount / 100 : null
}

function retailPriceFromDescription(description) {
  const match = plainText(description).match(/retails?\s+for\s+R\s*([\d,]+(?:\.\d{1,2})?)/i)
  if (!match) return null
  const amount = Number(match[1].replace(/,/g, ''))
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

function stockQuantity(product) {
  if (!product.is_in_stock) return 0
  const text = product.stock_availability?.text || ''
  const available = text.match(/(\d+)\s+in\s+stock/i)
  if (available) return Number(available[1])
  if (Number.isInteger(product.low_stock_remaining) && product.low_stock_remaining > 0) {
    return product.low_stock_remaining
  }
  const maximum = Number(product.add_to_cart?.maximum)
  return Number.isInteger(maximum) && maximum > 0 && maximum < 1000 ? maximum : 1
}

function parseProduct(source) {
  const name = cleanProductName(source.name)
  const stockNumber = String(source.sku || '').trim()
  if (!name || !stockNumber) throw new Error(`Product ${source.id} is missing a usable name or SKU.`)

  const regularPrice = numberFromPrice(source.prices?.regular_price) ?? numberFromPrice(source.prices?.price)
  const currentPrice = numberFromPrice(source.prices?.price)
  const salePrice = source.on_sale && currentPrice !== null && regularPrice !== null && currentPrice < regularPrice
    ? currentPrice
    : null
  const details = plainText(`${source.short_description || ''}\n${source.description || ''}`)
  const warrantyTerm = attribute(source, 'Warranty')
  const warrantyText = warrantyTerm || details.match(/\b(?:\d+\s*)?(?:year|month)s?\s+warranty\b/i)?.[0] || ''
  const warranty = warrantyText
    ? /warranty/i.test(warrantyText) ? warrantyText : `${warrantyText} Warranty`
    : null
  const category = source.categories?.[0]?.name ? decodeHtml(source.categories[0].name).trim() : null
  const condition = attribute(source, 'Condition') || 'Pre-Owned'
  const ram = attribute(source, 'RAM') || name.match(/\b\d+\s*GB\b/i)?.[0] || null
  const storage = attribute(source, 'Storage') || name.match(/\b\d+\s*(?:GB|TB)\s*(?:SSD|HDD|NVMe)?\b/i)?.[0] || null
  const cpuToken = name.match(/\[([^\]]+)\]/)?.[1]?.split('|').map((part) => part.trim()).find((part) =>
    /(?:core\s*(?:ultra\s*)?[3579]|ultra\s*[3579]|ryzen\s*[3579]|i[3579]-|celeron|pentium|m[1-9]\s*(?:pro|max)?|snapdragon)/i.test(part),
  )
  const gpu = name.match(/\b(?:RTX|GTX|Radeon|Intel Arc)\s*[^\]|,]+/i)?.[0]?.trim() || null
  const screen = name.match(/\b\d{1,2}(?:\.\d)?\s*(?:"|inches?\b)/i)?.[0] || null
  const screenSizeMatch = screen?.match(/\d{1,2}(?:\.\d)?/)
  const quantity = stockQuantity(source)
  const images = [...new Set((source.images || []).map((image) => image.src).filter((url) => /^https:\/\//i.test(url)))]

  return {
    stockNumber,
    name,
    brand: attribute(source, 'Brand') || null,
    model: null,
    condition,
    category,
    cpu: cpuToken || null,
    ram,
    storage,
    screen,
    screenSize: screenSizeMatch ? Number(screenSizeMatch[0]) : null,
    hasNumpad: /numeric keypad|numpad/i.test(details) ? true : null,
    gpu,
    warranty,
    description: details || null,
    costPrice: null,
    sellingPrice: regularPrice,
    salePrice,
    retailPrice: retailPriceFromDescription(details),
    quantity,
    status: 'active',
    listedAt: quantity > 0 ? new Date() : null,
    serialNumber: null,
    supplier: null,
    purchaseDate: null,
    websiteActive: quantity > 0,
    googleActive: false,
    metaActive: false,
    takealotActive: false,
    images: images.length ? {
      create: images.map((url, index) => ({ url, sortOrder: index, isPrimary: index === 0 })),
    } : undefined,
  }
}

try {
  const databaseUrl = process.env.DATABASE_URL || ''
  if (!/staging\.db(?:\?|$)/i.test(databaseUrl)) {
    throw new Error('Safety check stopped the reset: DATABASE_URL must point to staging.db.')
  }

  const response = await fetch(catalogUrl, { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error(`Live product feed returned HTTP ${response.status}.`)
  const sourceProducts = await response.json()
  if (!Array.isArray(sourceProducts) || sourceProducts.length < 10) {
    throw new Error('The live feed returned too few products; the staging database was not changed.')
  }

  const products = sourceProducts.map(parseProduct)
  const stockNumbers = new Set(products.map((product) => product.stockNumber))
  if (stockNumbers.size !== products.length) throw new Error('The live feed contains duplicate SKUs; the staging database was not changed.')

  await prisma.$transaction(async (tx) => {
    await tx.order.deleteMany()
    await tx.productImage.deleteMany()
    await tx.retailListing.deleteMany()
    await tx.product.deleteMany()
    await tx.invoiceSequence.deleteMany()

    for (const product of products) await tx.product.create({ data: product })
  }, { maxWait: 15000, timeout: 120000 })

  const inStock = products.filter((product) => product.quantity > 0).length
  console.log(`Staging reset complete: imported ${products.length} live products (${inStock} in stock); cleared test orders and invoice numbering.`)
  console.log('Customer accounts were left in place. Internal cost, supplier, serial-number, and purchase-date fields were left blank because the public shop does not provide them.')
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Staging catalogue reset failed.')
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
