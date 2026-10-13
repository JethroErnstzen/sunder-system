# Sunder Integrations — V15 foundation

The new Sunder site is a custom Next.js application. WooCommerce and Elementor are not required.

## Payment architecture

- Stitch Express: server-side hosted-checkout integration. The application creates the order from server-verified prices, creates the Stitch payment request, and redirects to Stitch. Only signed Svix webhook events update the payment status; redirect query parameters are never treated as proof of payment.
- Payflex: server-side API integration. Payment status will be reconciled from Payflex callbacks/status APIs.
- EFT: local order method; order remains Awaiting EFT Payment until verified.

### Stitch Express setup

Stitch checkout is disabled unless `STITCH_ENABLED=true`, client credentials and a webhook signing secret are configured, and `STITCH_ENV` is explicitly set to `test` or `live`. Small live payments are supported; they are real charges and may incur fees.

The variables below go in the **staging server's environment settings / secret manager** (not in this tracked guide and not in `.env.example`). Fill in the three blank values directly in that secure settings page:

```dotenv
APP_BASE_URL="https://staging.sunder.co.za"
STITCH_ENABLED="true"
STITCH_ENV="live"
STITCH_CLIENT_ID=""
STITCH_CLIENT_SECRET=""
STITCH_WEBHOOK_SECRET=""
```

- `STITCH_CLIENT_ID` and `STITCH_CLIENT_SECRET`: from the Stitch **Live** client Developer settings.
- `STITCH_WEBHOOK_SECRET`: signing secret for the endpoint you created in Stitch.
- Keep all three secret values out of chat, screenshots, source control, and this documentation file.

Configure these URLs in Stitch:

- **Redirect URL** (Developer settings): `https://staging.sunder.co.za/checkout/payment-result`
- **Webhook endpoint** (Webhooks → Endpoints), subscribed to `payment.paid` and `payment.settled`: `https://staging.sunder.co.za/api/payments/stitch/webhook`

The client needs the `client_paymentrequest` scope and the Stitch Express payment methods you intend to offer must be enabled for the client. Live payments are real charges and may incur fees.

Before setting `STITCH_ENABLED=true`, deploy the payment changes and apply the additive Prisma schema update on staging. Then start with a small real order, and confirm the order is marked paid in its account history and webhook delivery succeeds in Stitch.

The webhook handler validates Stitch's signed raw payload, matches payment events to the stored Stitch payment/request ID or link ID, and checks the amount against the order before updating its payment status. `payment.paid` and `payment.settled` are both treated as paid confirmations.

The `PaymentTransaction` schema change is additive. Back up the deployment database and run `npx prisma db push` from the deployed application directory before enabling checkout.

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
- Website orders send the customer a VAT invoice PDF and notify `ORDER_NOTIFICATION_EMAIL` (defaults to `sales@sunder.co.za`). Supplier invoice details are prefilled in `.env.example`; `INVOICE_BUSINESS_NAME`, `INVOICE_BUSINESS_VAT_NUMBER`, and `INVOICE_BUSINESS_ADDRESS` can override them. Configure the `SMTP_*` mail settings in the deployed environment. The admin notice includes the customer, items, total, payment method, and current payment status. Orders that are not yet paid are labelled as awaiting payment on the invoice. Invoice numbers are assigned sequentially inside the order transaction; the additive `Order.invoiceNumber`, `OrderItem.warranty`, and `InvoiceSequence` schema updates require `npx prisma db push` before deployment.
- Before deploying the account pages, take a staging database backup and run `npx prisma db push` from the application directory in the staging environment. This adds the customer/reset-token tables and optional customer link on orders.
- To enable existing WooCommerce customers to request password setup on staging, copy only the customer CSV to the staging app host and run the importer there. It does not import old order records or passwords; remove the temporary CSV afterward.
