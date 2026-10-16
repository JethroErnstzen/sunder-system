import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy notice | Sunder Computers' }

export default function PrivacyPage() {
  return <main style={{ maxWidth: 850, margin: '0 auto', padding: '48px 22px 72px', color: '#172033', lineHeight: 1.65 }}>
    <p style={{ color: '#2355c7', fontWeight: 700, letterSpacing: '.12em' }}>SUNDER COMPUTERS</p>
    <h1>Privacy notice</h1>
    <p><strong>Responsible party:</strong> Sunder Computers (Pty) Ltd, Delphi Arena, Shop 6, 1 Old Oak Road, Kenridge, Cape Town, 7530. Contact: <a href="mailto:sales@sunder.co.za">sales@sunder.co.za</a>.</p>
    <p>As you use this website, we automatically record a random browser ID and a separate session ID, pages visited, time spent on each page, the referring website host and campaign tags, and actions such as signing in, creating an account, adding products to a cart, and starting or submitting checkout. Product names, stock numbers, quantities and the selected payment method may appear in the activity history. The browser ID is stored in local browser storage and reused on return visits until that storage is cleared. Referral information comes from your browser and campaign tags in the page URL.</p>
    <p>We use these records to understand how visitors use the store, diagnose checkout problems, and improve the shopping experience. Access is limited to authorised Sunder staff. If you sign in, create an account, or submit checkout, the browser ID and its earlier unlinked sessions are associated with the existing customer profile used for the action; return visits from that browser can then be linked to the same profile. No extra profile fields are requested for this linking. The ID identifies a browser, so people sharing a device or browser may appear together.</p>
    <p>The activity records in this dashboard do not store your IP address, password, street address, card information, or the full referring URL. Detailed analytics records are kept for up to 90 days and then deleted; the browser ID remains in your browser until cleared.</p>
    <p>You may request access to or correction of personal information, or object to processing, by contacting <a href="mailto:sales@sunder.co.za">sales@sunder.co.za</a>. You may also lodge a complaint with the <a href="https://inforegulator.org.za/" target="_blank" rel="noreferrer">Information Regulator of South Africa</a>.</p>
  </main>
}
