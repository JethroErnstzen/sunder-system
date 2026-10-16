'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RefreshAnalytics() {
  const router = useRouter()
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 5_000)
    return () => window.clearInterval(timer)
  }, [router])
  return <span style={{ fontSize: 12, color: '#718096', whiteSpace: 'nowrap' }}>Live · refreshes every 5 seconds</span>
}
