export type AnalyticsLocation = {
  city: string | null
  region: string | null
  country: string | null
  countryCode: string | null
}

function clean(value: string | null, maxLength = 100) {
  const normalized = value?.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength)
  return normalized || null
}

function countryName(code: string | null) {
  if (!code || !/^[A-Z]{2}$/.test(code)) return null
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code
  } catch {
    return code
  }
}

/**
 * Read approximate location headers added by a trusted reverse proxy. Cloudflare
 * requires its visitor-location managed transform for city and region headers.
 * A Plesk/nginx GeoIP setup can pass the same x-geoip-* headers to the app.
 */
export function getAnalyticsLocation(headers: Headers): AnalyticsLocation {
  const cloudflare = Boolean(headers.get('cf-ray') && headers.get('cf-connecting-ip'))
  const vercel = Boolean(headers.get('x-vercel-id'))

  let city: string | null = null
  let region: string | null = null
  let country: string | null = null
  let countryCode: string | null = null

  if (cloudflare) {
    city = clean(headers.get('cf-ipcity'))
    region = clean(headers.get('cf-region'))
    countryCode = clean(headers.get('cf-ipcountry'), 2)?.toUpperCase() || null
  } else if (vercel) {
    city = clean(headers.get('x-vercel-ip-city'))
    region = clean(headers.get('x-vercel-ip-country-region'))
    countryCode = clean(headers.get('x-vercel-ip-country'), 2)?.toUpperCase() || null
  } else {
    // These headers must be set/overwritten by the server proxy, never passed through from visitors.
    city = clean(headers.get('x-geoip-city'))
    region = clean(headers.get('x-geoip-region'))
    country = clean(headers.get('x-geoip-country'))
    countryCode = clean(headers.get('x-geoip-country-code'), 2)?.toUpperCase() || null
  }

  return { city, region, country: country || countryName(countryCode), countryCode }
}

export function locationLabel(location: Pick<AnalyticsLocation, 'city' | 'region' | 'country'>) {
  return [location.city, location.region, location.country].filter(Boolean).join(', ') || 'Location unavailable'
}
