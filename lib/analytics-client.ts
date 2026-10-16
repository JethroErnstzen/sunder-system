'use client'

type AnalyticsPayload = {
  eventType: string
  path?: string
  title?: string
  productStockNumber?: string
  quantity?: number
  durationMs?: number
  paymentMethod?: string
  orderNumber?: string
  details?: string
  referrerHost?: string
  campaignSource?: string
  campaignMedium?: string
  campaignName?: string
}

const SESSION_KEY = 'sunder-analytics-session'
const VISITOR_KEY = 'sunder-analytics-visitor'
const FALLBACK_VISITOR_KEY = 'sunder-analytics-visitor-session'
const LAST_ACTIVE_KEY = 'sunder-analytics-last-active'
const SESSION_IDLE_MS = 30 * 60 * 1000

function keys() {
  const now = Date.now()
  try {
    const lastActive = Number(sessionStorage.getItem(LAST_ACTIVE_KEY) || 0)
    if (!sessionStorage.getItem(SESSION_KEY) || now - lastActive > SESSION_IDLE_MS) {
      sessionStorage.setItem(SESSION_KEY, crypto.randomUUID())
    }
    sessionStorage.setItem(LAST_ACTIVE_KEY, String(now))
    let visitorKey: string | null = null
    try {
      visitorKey = localStorage.getItem(VISITOR_KEY)
      if (!visitorKey) {
        visitorKey = crypto.randomUUID()
        localStorage.setItem(VISITOR_KEY, visitorKey)
      }
    } catch {
      visitorKey = sessionStorage.getItem(FALLBACK_VISITOR_KEY)
      if (!visitorKey) {
        visitorKey = crypto.randomUUID()
        sessionStorage.setItem(FALLBACK_VISITOR_KEY, visitorKey)
      }
    }
    if (!visitorKey) return null
    return { sessionKey: sessionStorage.getItem(SESSION_KEY)!, visitorKey }
  } catch { return null }
}

function attribution() {
  let referrerHost: string | undefined
  let campaignSource: string | undefined
  let campaignMedium: string | undefined
  let campaignName: string | undefined
  try {
    if (document.referrer) referrerHost = new URL(document.referrer).hostname.slice(0, 120)
    const query = new URLSearchParams(window.location.search)
    const clean = (key: string) => query.get(key)?.replace(/[^\w .-]/g, '').slice(0, 120) || undefined
    campaignSource = clean('utm_source')
    campaignMedium = clean('utm_medium')
    campaignName = clean('utm_campaign')
  } catch {}
  return { referrerHost, campaignSource, campaignMedium, campaignName }
}

export function trackAnalytics(payload: AnalyticsPayload, options: { keepalive?: boolean } = {}) {
  const identifiers = keys()
  if (!identifiers) return
  const attributionKey = `sunder-analytics-attributed:${identifiers.sessionKey}`
  const firstAttribution = !sessionStorage.getItem(attributionKey)
  if (firstAttribution) sessionStorage.setItem(attributionKey, 'yes')
  const safePath = payload.path || window.location.pathname
  const data = {
    ...identifiers,
    ...payload,
    path: safePath.slice(0, 500),
    ...(firstAttribution ? attribution() : {}),
  }
  try {
    void fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: options.keepalive ?? true,
    }).catch(() => {})
  } catch {}
}
