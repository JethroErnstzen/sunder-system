'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './PayflexWidget.module.css'

export default function PayflexWidget({ price }: { price: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    setFailed(false)
    container.replaceChildren()
    const script = document.createElement('script')
    const query = new URLSearchParams({
      type: 'calculator',
      min: '10',
      max: '20000',
      amount: price.toFixed(2),
      logo_type: 'purple',
    })
    script.src = `https://widgets.payflex.co.za/2.0.3/payflex-widget.min.js?${query.toString()}`
    script.async = true
    script.type = 'application/javascript'
    script.onerror = () => setFailed(true)
    container.appendChild(script)

    return () => {
      script.onerror = null
      script.remove()
      container.replaceChildren()
    }
  }, [price])

  return (
    <div className={styles.wrapper}>
      <div id="payflex-widget-container" ref={containerRef} aria-live="polite" />
      {failed && <p className={styles.error} role="status">Payflex instalment information is temporarily unavailable.</p>}
    </div>
  )
}
