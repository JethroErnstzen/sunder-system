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

## Customer accounts and order history

- Orders placed on the new site are associated with a customer by normalized email address. Customer accounts are created as part of checkout; order history contains new-site orders only.
- The old WooCommerce customer CSV can be imported without importing legacy order totals or passwords:

  ```bash
  node scripts/import-woocommerce-customers.mjs path/to/customers.csv
  ```

  The importer prints aggregate counts only. Keep the CSV out of Git and delete temporary copies after import.
- Existing customers request a password setup link from `/register`. Links are random, one-time, stored hashed, and expire after 30 minutes. Passwords are stored as scrypt hashes.
- Configure `CUSTOMER_SESSION_SECRET`, `APP_BASE_URL`, and the `SMTP_*` variables from `.env.example` in the staging/production environment before enabling account recovery. Never commit or share the SMTP password or session secret.
- Before deploying the account pages, take a staging database backup and run `npx prisma db push` from the application directory in the staging environment. This adds the customer/reset-token tables and optional customer link on orders.
- To enable existing WooCommerce customers to request password setup on staging, copy only the customer CSV to the staging app host and run the importer there. It does not import old order records or passwords; remove the temporary CSV afterward.
