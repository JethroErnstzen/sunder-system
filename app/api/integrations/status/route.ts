import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    stitch: { configured: Boolean(process.env.STITCH_CLIENT_ID && process.env.STITCH_CLIENT_SECRET), environment: process.env.STITCH_ENV || 'test' },
    payflex: { configured: Boolean(process.env.PAYFLEX_CLIENT_ID && process.env.PAYFLEX_CLIENT_SECRET), environment: process.env.PAYFLEX_ENV || 'sandbox' },
    google: { feed: '/api/feeds/google.xml' },
    meta: { feed: '/api/feeds/meta.xml' },
    takealot: { configured: false },
  })
}
