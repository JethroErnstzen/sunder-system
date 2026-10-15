import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

const scrypt = promisify(scryptCallback)
export const CUSTOMER_COOKIE = 'sunder-customer-session'
const SESSION_SECONDS = 60 * 60 * 24 * 30

function sessionSecret() {
  const secret = process.env.CUSTOMER_SESSION_SECRET
  if (!secret) throw new Error('CUSTOMER_SESSION_SECRET is not configured.')
  return secret
}

function sign(payload: string) {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url')
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function createCustomerSession(customerId: string, sessionVersion: number) {
  const payload = Buffer.from(JSON.stringify({
    sub: customerId,
    ver: sessionVersion,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function verifyCustomerSession(token: string | undefined) {
  if (!token) return null
  const [payload, suppliedSignature] = token.split('.')
  if (!payload || !suppliedSignature) return null
  try {
    if (!safeEqual(sign(payload), suppliedSignature)) return null
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof session.sub !== 'string' || !Number.isInteger(session.ver) || session.exp <= Math.floor(Date.now() / 1000)) return null
    return { customerId: session.sub as string, sessionVersion: session.ver as number }
  } catch {
    return null
  }
}

export function customerCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_SECONDS,
  }
}

export async function getCurrentCustomer() {
  const cookieStore = await cookies()
  const session = verifyCustomerSession(cookieStore.get(CUSTOMER_COOKIE)?.value)
  if (!session) return null
  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      source: true,
      createdAt: true,
      updatedAt: true,
      sessionVersion: true,
      addresses: {
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          label: true,
          recipientName: true,
          phone: true,
          addressLine1: true,
          suburb: true,
          city: true,
          province: true,
          postalCode: true,
          isDefault: true,
        },
      },
    },
  })
  return customer?.sessionVersion === session.sessionVersion ? customer : null
}

export async function hashCustomerPassword(password: string) {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, 64) as Buffer
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`
}

export async function verifyCustomerPassword(password: string, storedHash: string | null) {
  if (!storedHash) return false
  const [algorithm, saltText, hashText] = storedHash.split('$')
  if (algorithm !== 'scrypt' || !saltText || !hashText) return false
  try {
    const expected = Buffer.from(hashText, 'base64url')
    const actual = await scrypt(password, Buffer.from(saltText, 'base64url'), expected.length) as Buffer
    return safeEqual(actual.toString('base64url'), expected.toString('base64url'))
  } catch {
    return false
  }
}

export function createPasswordResetToken() {
  const token = randomBytes(32).toString('base64url')
  return {
    token,
    tokenHash: createHash('sha256').update(token).digest('hex'),
  }
}

export function hashPasswordResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
