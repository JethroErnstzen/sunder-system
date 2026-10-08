# Sunder Integrations — V15 foundation

The new Sunder site is a custom Next.js application. WooCommerce and Elementor are not required.

## Payment architecture

- Stitch: server-side integration. Client secret must never be exposed to the browser. Payment status will be reconciled from Stitch webhooks.
- Payflex: server-side API integration. Payment status will be reconciled from Payflex callbacks/status APIs.
- EFT: local order method; order remains Awaiting EFT Payment until verified.

## Sales channels

The Product record is the master source of truth. Channel flags are already present:
- websiteActive
- googleActive
- metaActive
- takealotActive

Google product feeds and structured product data will be generated from the same Product records. Meta catalogue feed/export will use the same source. Takealot export/API integration will use the same source once the seller API/feed credentials are available.

## Required credentials later

Do not paste secrets into chat. Put them in the local .env file or production secret manager.

Stitch:
- Client ID
- Client Secret
- registered HTTPS redirect/webhook URLs

Payflex:
- Client ID
- Secret Key
- signed merchant agreement / live credentials

Google:
- Merchant Center account
- verified/claimed sunder.co.za domain

Meta:
- Meta Business account
- Commerce Manager catalogue access

Takealot:
- seller/API/feed credentials as provided by Takealot
