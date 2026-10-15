import { NextResponse } from 'next/server'
import { isPayflexConfigured } from '@/lib/payflex'

export async function GET() {
  return NextResponse.json({
    stitch: {
      configured: process.env.STITCH_ENABLED === 'true' &&
        Boolean(process.env.STITCH_CLIENT_ID && process.env.STITCH_CLIENT_SECRET && process.env.STITCH_WEBHOOK_SECRET),
      environment: process.env.STITCH_ENV || 'test',
    },
    payflex: { configured: isPayflexConfigured(), environment: process.env.PAYFLEX_ENV || 'sandbox' },
    google: { feed: '/api/feeds/google.xml' },
    meta: { feed: '/api/feeds/meta.xml' },
    takealot: { configured: false },
  })
}
