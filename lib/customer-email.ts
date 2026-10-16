import nodemailer from 'nodemailer'

type MailAttachment = {
  filename: string
  content: Buffer | string
  contentType?: string
}

function getMailConfig() {
  const host = process.env.SMTP_HOST
  const from = process.env.SMTP_FROM
  if (!host || !from) throw new Error('Customer email delivery is not configured.')

  const port = Number(process.env.SMTP_PORT || 587)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT must be a valid TCP port.')
  }

  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD
  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    auth: user && pass ? { user, pass } : undefined,
    from,
  }
}

export function assertCustomerEmailConfigured() {
  getMailConfig()
  return getCustomerAccountBaseUrl()
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  await sendEmail({
    to: email,
    subject: 'Set up your Sunder Computers account password',
    text: `We have created a new Sunder Computers website. Use this secure link to set or reset your password and access your account: ${resetUrl}\n\nThis link expires in 30 minutes. If you did not request it, you can ignore this email.`,
    html: `<p>We have created a new Sunder Computers website.</p><p><a href="${resetUrl}">Set or reset your password</a> to access your account.</p><p>This secure link expires in 30 minutes. If you did not request it, you can ignore this email.</p>`,
  })
}

export async function sendNewAccountAlert({
  fullName,
  email,
  phone,
  createdAt,
}: {
  fullName: string
  email: string
  phone: string
  createdAt: Date
}) {
  const notificationEmail = process.env.ORDER_NOTIFICATION_EMAIL?.trim() || 'sales@sunder.co.za'
  await sendEmail({
    to: notificationEmail,
    subject: `New Sunder website account: ${fullName.replace(/[\r\n]+/g, ' ').slice(0, 120)}`,
    text: [
      'A customer created an account on the Sunder Computers website.',
      '',
      `Name: ${fullName}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Created: ${createdAt.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}`,
    ].join('\n'),
  })
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
  attachments,
  replyTo,
}: {
  to: string
  subject: string
  text: string
  html?: string
  attachments?: MailAttachment[]
  replyTo?: string
}) {
  const config = getMailConfig()
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  })

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
    ...(attachments ? { attachments } : {}),
    ...(replyTo ? { replyTo } : {}),
  })
}

export function getCustomerAccountBaseUrl() {
  const configuredUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (!configuredUrl) throw new Error('APP_BASE_URL is not configured.')
  const url = new URL(configuredUrl)
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('APP_BASE_URL must use HTTPS in production.')
  }
  return url.origin
}
