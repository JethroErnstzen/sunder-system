'use client'

import { useEffect, useState } from 'react'

type StitchBNPLConfig = {
  mountSelector: string
  price: number
  minimumAmount: number
  logoBg: string
  width: string
  locale: string
  currency: string
}

declare global {
  interface Window {
    StitchBNPLConfig?: StitchBNPLConfig
    StitchBNPL?: {
      setPrice?: (price: number) => void
    }
  }
}

const SCRIPT_ID = 'stitch-bnpl-widget-script'
const SCRIPT_URL = 'https://express.stitch.money/js/bnpl-widget.v1.js'

export default function StitchBNPLWidget({ price }: { price: number }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    window.StitchBNPLConfig = {
      mountSelector: '#stitch-bnpl-widget',
      price,
      minimumAmount: 100,
      logoBg: 'purple',
      width: '100%',
      locale: 'en-ZA',
      currency: 'ZAR',
    }

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (window.StitchBNPL?.setPrice) {
      window.StitchBNPL.setPrice(price)
      setFailed(false)
      return
    }

    const script = existingScript ?? document.createElement('script')
    const handleLoad = () => {
      script.dataset.loaded = 'true'
      window.StitchBNPL?.setPrice?.(price)
      setFailed(false)
    }
    const handleError = () => {
      console.error('Unable to load the Stitch BNPL widget.')
      setFailed(true)
    }

    script.addEventListener('load', handleLoad)
    script.addEventListener('error', handleError)

    if (!existingScript) {
      script.id = SCRIPT_ID
      script.src = SCRIPT_URL
      script.async = true
      document.body.appendChild(script)
    } else if (script.dataset.loaded === 'true') {
      handleLoad()
    }

    return () => {
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
    }
  }, [price])

  return (
    <>
      <div id="stitch-bnpl-widget" aria-live="polite" />
      {failed && <p role="status">Stitch instalment options are temporarily unavailable.</p>}
    </>
  )
}
