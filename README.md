# Sunder Computers — V15

Custom Next.js + Prisma ecommerce platform. No WooCommerce or Elementor.

## Current product import

`data/current-products.json` contains the current Sunder product catalogue imported from the live site and cross-checked against the staging WordPress database.

A pre-populated local SQLite database is included as `dev.db`.

To rebuild the product database after `prisma db push`, run:

```bash
npm install
npx prisma db push
node scripts/import-current-products.mjs
```

The import includes product names, SKUs, brands, conditions, categories, descriptions, specifications where available, selling prices, retail prices where present, stock quantities, channel flags and the current site's product image URLs.

## Admin access

Admin pages and product-management APIs require an authenticated admin session. Configure these server-only variables in `.env.local` before signing in:

```env
ADMIN_PASSWORD="qazWSXedc"
ADMIN_SESSION_SECRET="NrtJXB7QU-6-sLUNhMNm-gxQDDoD5z6oHJethLLG4HU"
```

Generate a session secret locally with:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Restart the dev server after setting the values. Sign in at `/admin-login`; the inventory dashboard is `/admin`.
