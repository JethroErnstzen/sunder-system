'use client'

import { useEffect, useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackAnalytics } from '@/lib/analytics-client'

export default function AnalyticsTracker() {
  const pathname = usePathname()

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [pathname])

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || pathname === '/admin-login') return
    const startedAt = Date.now()
    const stockNumber = pathname.match(/^\/shop\/([^/]+)\/?$/)?.[1]
    trackAnalytics({
      eventType: stockNumber ? 'product_view' : pathname === '/checkout' ? 'checkout_view' : 'page_view',
      path: pathname,
      title: document.title.slice(0, 200),
      productStockNumber: stockNumber ? decodeURIComponent(stockNumber).slice(0, 80) : undefined,
    })
    const reportDuration = () => {
      const durationMs = Math.min(Date.now() - startedAt, 60 * 60 * 1000)
      if (durationMs >= 1000) trackAnalytics({ eventType: 'page_time', path: pathname, title: document.title.slice(0, 200), durationMs }, { keepalive: true })
    }
    const heartbeat = window.setInterval(() => trackAnalytics({ eventType: 'heartbeat', path: pathname, title: document.title.slice(0, 200) }), 15_000)
    window.addEventListener('pagehide', reportDuration)
    return () => {
      window.clearInterval(heartbeat)
      window.removeEventListener('pagehide', reportDuration)
      reportDuration()
    }
  }, [pathname])

  return null
}
