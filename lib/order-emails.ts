import { sendEmail } from '@/lib/customer-email'

type InvoiceItem = {
  name: string
  stockNumber: string
  condition: string | null
  warranty: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

type OrderForEmail = {
  orderNumber: string
  invoiceNumber: number | null
  createdAt: Date
  email: string
  phone: string | null
  firstName: string | null
  lastName: string | null
  companyName: string | null
  customerType: string
  vatNumber: string | null
  billingAddress: string | null
  billingSuburb: string | null
  billingCity: string | null
  billingProvince: string | null
  billingPostalCode: string | null
  paymentMethod: string | null
  paymentStatus: string
  subtotal: number
  shipping: number
  tax: number
  total: number
  items: InvoiceItem[]
}

function money(amount: number) {
  const [whole, cents] = Number(amount).toFixed(2).split('.')
  return `R ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${cents}`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!)
}

function pdfText(value: string) {
  return value.normalize('NFKD').replace(/[^\x20-\x7E]/g, '?').replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
}

function pdfLine(text: string, x: number, y: number, size = 9, bold = false) {
  return `BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfText(text)}) Tj ET\n`
}

function makeInvoicePdf(order: OrderForEmail) {
  const supplierName = process.env.INVOICE_BUSINESS_NAME?.trim() || 'Sunder Computers (Pty) Ltd'
  const supplierVat = process.env.INVOICE_BUSINESS_VAT_NUMBER?.trim() || '4640309995'
  const supplierAddress = process.env.INVOICE_BUSINESS_ADDRESS?.trim() || 'Delphi Arena, Shop 6, 1 Old Oak Road, Kenridge, Cape Town, 7530'
  const invoiceNumber = `INV-${String(order.invoiceNumber ?? 0).padStart(6, '0')}`

  const customerName = order.customerType === 'company'
    ? order.companyName || `${order.firstName || ''} ${order.lastName || ''}`.trim()
    : `${order.firstName || ''} ${order.lastName || ''}`.trim()
  const customerAddress = [order.billingAddress, order.billingSuburb, order.billingCity, order.billingProvince, order.billingPostalCode]
    .filter(Boolean).join(', ')
  const status = order.paymentStatus.toLowerCase() === 'paid' ? 'Paid' : `Payment due - ${paymentMethodLabel(order.paymentMethod)}`
  const pages: string[] = []
  const rowsPerPage = 10
  const itemPages = Math.max(1, Math.ceil(order.items.length / rowsPerPage))

  for (let pageIndex = 0; pageIndex < itemPages; pageIndex++) {
    const pageItems = order.items.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage)
    let content = ''
    content += pdfLine(supplierName, 42, 796, 18, true)
    content += pdfLine('TAX INVOICE', 420, 796, 14, true)
    content += pdfLine(`Invoice number: ${invoiceNumber}`, 365, 775, 9)
    content += pdfLine(`Issue date: ${order.createdAt.toLocaleDateString('en-ZA')}`, 365, 760, 9)
    content += pdfLine(`Status: ${status}`, 365, 745, 9)
    content += pdfLine(`VAT number: ${supplierVat}`, 42, 770, 9)
    content += pdfLine('Supplier address:', 42, 750, 9, true)
    content += pdfLine(supplierAddress.slice(0, 85), 42, 736, 9)
    if (supplierAddress.length > 85) content += pdfLine(supplierAddress.slice(85, 170), 42, 722, 9)

    const customerY = 690
    content += pdfLine('BILL TO', 42, customerY, 9, true)
    content += pdfLine(customerName || order.email, 42, customerY - 16, 9)
    content += pdfLine(order.email, 42, customerY - 30, 9)
    if (customerAddress) content += pdfLine(customerAddress.slice(0, 90), 42, customerY - 44, 9)
    if (order.phone) content += pdfLine(`Phone: ${order.phone}`, 42, customerY - 58, 9)
    if (order.customerType === 'company' && order.vatNumber) content += pdfLine(`Customer VAT number: ${order.vatNumber}`, 42, customerY - 58, 9)

    const tableY = 610
    content += pdfLine('Description', 42, tableY, 9, true)
    content += pdfLine('Qty', 340, tableY, 9, true)
    content += pdfLine('Unit price', 385, tableY, 9, true)
    content += pdfLine('Total', 490, tableY, 9, true)
    content += `0.6 w 42 ${tableY - 7} m 553 ${tableY - 7} l S\n`

    pageItems.forEach((item, index) => {
      const y = tableY - 25 - index * 38
      content += pdfLine(item.name.slice(0, 52), 42, y, 8)
      if (item.name.length > 52) content += pdfLine(item.name.slice(52, 104), 42, y - 10, 8)
      content += pdfLine(`Warranty: ${item.warranty || 'As stated on the product listing'}`, 42, y - 21, 8)
      content += pdfLine([item.stockNumber, item.condition].filter(Boolean).join(' - '), 42, y - 31, 7)
      content += pdfLine(String(item.quantity), 345, y, 8)
      content += pdfLine(money(item.unitPrice), 385, y, 8)
      content += pdfLine(money(item.lineTotal), 490, y, 8)
    })

    if (pageIndex === itemPages - 1) {
      const totalsY = Math.max(70, tableY - 37 - pageItems.length * 38)
      content += pdfLine(`Subtotal (excl. VAT): ${money(order.total - order.tax)}`, 350, totalsY, 9)
      content += pdfLine(`VAT included at 15%: ${money(order.tax)}`, 350, totalsY - 17, 9)
      if (order.shipping > 0) content += pdfLine(`Shipping: ${money(order.shipping)}`, 350, totalsY - 34, 9)
      const totalY = totalsY - (order.shipping > 0 ? 55 : 34)
      content += pdfLine(`TOTAL (incl. VAT): ${money(order.total)}`, 350, totalY, 11, true)
      const bankY = totalY - 30
      content += pdfLine('Bank transfer details', 350, bankY, 9, true)
      content += pdfLine('Bank: FNB', 350, bankY - 13, 8)
      content += pdfLine('Account name: Sunder Computers (Pty) Ltd', 350, bankY - 25, 8)
      content += pdfLine('Account type: Gold Business Account', 350, bankY - 37, 8)
      content += pdfLine('Account number: 63038469713', 350, bankY - 49, 8)
      content += pdfLine('Branch code: 220323', 350, bankY - 61, 8)
      content += pdfLine('Warranty terms: https://www.sunder.co.za/warranty/', 42, 55, 8)
    }
    content += pdfLine(`Sunder Computers | ${invoiceNumber} | Page ${pageIndex + 1} of ${itemPages}`, 42, 30, 8)
    pages.push(content)
  }

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${5 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ]
  pages.forEach((content, index) => {
    const pageObject = 5 + index * 2
    const contentObject = pageObject + 1
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`)
    objects.push(`<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}endstream`)
  })

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'ascii'))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xrefOffset = Buffer.byteLength(pdf, 'ascii')
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset) => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n` })
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return Buffer.from(pdf, 'ascii')
}

function paymentMethodLabel(method: string | null) {
  return ({
    stitch: 'Stitch Express',
    stitchPayLater: 'Stitch Pay Later',
    eft: 'EFT / Bank Transfer',
    payflex: 'Payflex',
  } as Record<string, string>)[method || ''] || 'Not specified'
}

function emailFailureDiagnostic(reason: unknown) {
  if (!(reason instanceof Error)) return 'Unknown mail delivery error.'
  const smtpError = reason as Error & { code?: string; responseCode?: number; command?: string }
  const details = [smtpError.code, smtpError.responseCode ? `SMTP ${smtpError.responseCode}` : '', smtpError.command]
    .filter(Boolean)
    .join(' · ')
  if (details) return details
  return reason.message.replace(/(pass(?:word)?\s*[:=]\s*)\S+/ig, '$1[redacted]').slice(0, 200)
}

export async function sendOrderEmails(order: OrderForEmail) {
  const buyerName = [order.firstName, order.lastName].filter(Boolean).join(' ') || order.companyName || order.email
  const method = paymentMethodLabel(order.paymentMethod)
  const paymentState = order.paymentStatus.toLowerCase() === 'paid' ? 'Paid' : 'Awaiting payment'
  const notificationEmail = process.env.ORDER_NOTIFICATION_EMAIL?.trim() || 'sales@sunder.co.za'
  const customerEmail = (async () => {
    const pdf = makeInvoicePdf(order)
    await sendEmail({
      to: order.email,
      subject: `VAT invoice INV-${String(order.invoiceNumber ?? 0).padStart(6, '0')} - Sunder Computers`,
      text: `Hello ${buyerName},\n\nThank you for your order. Your VAT invoice is attached.\n\nInvoice: INV-${String(order.invoiceNumber ?? 0).padStart(6, '0')}\nPayment method: ${method}\nPayment status: ${paymentState}\nTotal: ${money(order.total)}\n\nWarranty terms: https://www.sunder.co.za/warranty/\n\nSunder Computers`,
      html: `<p>Hello ${escapeHtml(buyerName)},</p><p>Thank you for your order. Your VAT invoice is attached.</p><p><strong>Invoice:</strong> INV-${String(order.invoiceNumber ?? 0).padStart(6, '0')}<br><strong>Payment method:</strong> ${escapeHtml(method)}<br><strong>Payment status:</strong> ${escapeHtml(paymentState)}<br><strong>Total:</strong> ${money(order.total)}</p><p><a href="https://www.sunder.co.za/warranty/">View warranty terms</a></p><p>Sunder Computers</p>`,
      attachments: [{ filename: `VAT-Invoice-INV-${String(order.invoiceNumber ?? 0).padStart(6, '0')}.pdf`, content: pdf, contentType: 'application/pdf' }],
    })
  })()
  const adminEmail = sendEmail({
    to: notificationEmail,
    subject: `New website order ${order.orderNumber} - ${money(order.total)}`,
    text: [
      'A purchase was placed on the Sunder Computers website.',
      '',
      `Order: ${order.orderNumber}`,
      `Invoice: INV-${String(order.invoiceNumber ?? 0).padStart(6, '0')}`,
      `Customer: ${buyerName}`,
      `Email: ${order.email}`,
      `Phone: ${order.phone || 'Not provided'}`,
      `Company: ${order.companyName || 'Private individual'}`,
      `Payment method: ${method}`,
      `Payment status: ${paymentState}`,
      `Total: ${money(order.total)}`,
      '',
      'Items:',
      ...order.items.map((item) => `- ${item.quantity} x ${item.name} (${item.stockNumber}) - ${money(item.lineTotal)}`),
    ].join('\n'),
  })

  const outcomes = await Promise.allSettled([customerEmail, adminEmail])
  outcomes.forEach((outcome, index) => {
    if (outcome.status === 'rejected') {
      console.error(index === 0 ? 'Customer VAT invoice email failed:' : 'New order notification email failed:', outcome.reason)
    }
  })
  return {
    customerEmailSent: outcomes[0].status === 'fulfilled',
    adminEmailSent: outcomes[1].status === 'fulfilled',
    emailErrors: {
      customer: outcomes[0].status === 'rejected' ? emailFailureDiagnostic(outcomes[0].reason) : null,
      admin: outcomes[1].status === 'rejected' ? emailFailureDiagnostic(outcomes[1].reason) : null,
    },
  }
}
