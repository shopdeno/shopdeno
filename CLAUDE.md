# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Next.js 16 (App Router, React 19) storefront on a **Saleor** GraphQL backend. It is replacing the client's WooCommerce shop (Dennis Muraguri — Nairobi matatu/sacco art prints). Saleor runs locally via `docker-compose up -d` (`http://localhost:8000`) or Saleor Cloud in prod. Full migration plan: `~/.claude/plans/peppy-zooming-zephyr.md`. Persistent context also in the Claude memory store (`catalyst-migration-context`, `catalyst-storefront-known-bugs`).

## Commands

```bash
npm run dev           # dev server on :3000 (needs NEXT_PUBLIC_SALEOR_API_URL set)
npm run build         # production build
npm run lint          # eslint (flat config)
npx tsc --noEmit      # typecheck
npm run test:e2e      # Playwright tests (testDir: ./tests — NOT ./e2e, see Gotchas)
npm run generate-gifs # generate animated GIFs from multi-image products (needs .env)
docker-compose up -d          # local Saleor (api :8000; db/redis internal-only)
docker-compose logs -f api    # tail Saleor logs
# Catalog migration (WooCommerce -> Saleor), staged + idempotent:
node scripts/migrate-woo-to-saleor.mjs <setup|categories|products|images|all> [--limit N] [--status any] [--only <wooId>]
```

No unit/integration test runner. Env required: copy `.env.example` → `.env`, set `NEXT_PUBLIC_SALEOR_API_URL` (client throws if unset). `NEXT_PUBLIC_SALEOR_CHANNEL` defaults to `default-channel`. Local Saleor admin: `admin@example.com` / `admin`.

## Architecture

**Two Saleor clients.** `src/lib/saleor.ts` builds a memoized `urql` client (`getSaleorClient`) + a thin `saleorClient` wrapper (`.query`/`.mutation` → promises). This is the **browser/anonymous/customer-token client** — used in Server Components and Context hooks, reads auth from the `saleor_auth_token` cookie via `src/lib/auth-token.ts`. It sets **`preferGetMethod: false`** (urql v5 defaults to GET; Saleor serves the GraphiQL HTML on GET so every query silently fails without this). `src/lib/saleor-server.ts` is the **server-only admin client** (`saleorAdmin<T>(doc, vars)`) — used only in Route Handlers, carries an app token with `HANDLE_PAYMENTS` + `MANAGE_CHECKOUTS` for transactions and checkout completion. Auth resolution: `SALEOR_APP_TOKEN` env first, then staff `tokenCreate` fallback with `SALEOR_EMAIL`/`SALEOR_PASSWORD`.

**GraphQL documents.** Live in `src/graphql/` (`queries.ts`, `cart.ts`, `checkout.ts`, `auth.ts`, `transactions.ts`), `gql`-tagged from `graphql-tag`, parsed at **runtime**. Do **not** re-add `babel.config.js` (kept as `.disabled`) — it makes Turbopack panic-loop.

**State via React Context.** Providers, each backed by Saleor mutations: `context/CartContext.tsx` (cart = a Saleor Checkout; id in `localStorage["cartId"]`; `useCart()`), `context/AuthContext.tsx` (`useAuth()`; token in the `saleor_auth_token` cookie), `context/CheckoutContext.tsx` (`useCheckout()`). `app/providers.tsx` wraps Auth + Cart only; checkout pages provide `CheckoutProvider` themselves.

**Data fetching split.** Layout + top-level pages fetch server-side via `getSaleorClient()`. Interactive parts are `"use client"` via context hooks. Product/collection pages = `page.tsx` (server) + `*Client.tsx`/`ProductGrid.tsx` (client).

**Shared building blocks (reuse these):**
- `src/lib/site-config.ts` — brand name/tagline/urls/contact/studio pickup address/social links/press, env-overridable. Use instead of hardcoding "Store" or phone numbers. Exports `productDisplayName(name)` (strips sacco/route suffixes for display) and `FEATURED_SLUGS` (products pinned to top of grid).
- `src/lib/browse-config.ts` — `SACCO_CATEGORY_SLUGS` array: the canonical list of which Saleor category slugs represent matatu saccos. Add new saccos here when categories are created.
- `src/lib/product-sort.ts` — `toProductOrder(sort, channel)` maps UI sort values → Saleor `ProductOrder` object.
- `src/components/ProductCard.tsx` — presentational tile for all grids. Handles hover GIFs (CSS opacity preload pattern): if `public/product-gifs/{base64ProductId}.gif` exists and product has multiple images, the GIF overlays on hover with no layout shift. Generate GIFs with `npm run generate-gifs`; they go in `public/product-gifs/` named by base64-encoded product ID.
- `src/components/SearchBox.tsx` — shared search input.
- `src/lib/imageUtils.ts` — `getBlurDataURL()` returns a 1×1 transparent PNG data URI for `next/image` placeholder.

**Routes.** Home, `/products` (PLP), `/search`, `/collections` + `/collections/[slug]`, `/categories/[slug]`, `/saccos`, `/products/[slug]`, `/account` + `/account/login|register|addresses|addresses/new|orders/[id]`, `/checkout`. Static content pages: `/faq`, `/contact`, `/shipping-and-delivery`, `/refund-returns`, `/privacy-policy`, `/cookies-policy`, `/term-and-conditions`.

**API Routes** (`src/app/api/`): `checkout/complete` (studio pickup — AUTHORIZED transaction + `checkoutComplete`), `payments/pesapal/` (stubbed), `payments/paypal/` (stubbed).

## Migration (WooCommerce → Saleor)

`scripts/migrate-woo-to-saleor.mjs` reads WC REST (`http://shop-deno-local.local`, basic auth admin + app password) and writes Saleor GraphQL admin API. Stages: `setup` (Color attribute + two product types: `Matatu Art Print`, `Matatu Art Print (Color)`), `categories`, `products` (variants, $50 USD pricing, stock, publish state, SEO from `ssp_meta_*`, descriptions), `images` (`.avif`→jpg via macOS `sips`→ Saleor multipart upload). Idempotent by slug/SKU. Env-configurable (`WC_BASE`, `SALEOR_URL`, `CHANNEL`, `WAREHOUSE`, …) — point at Saleor Cloud to run against prod. **Done on local sandbox:** 74 products (34 published + 40 draft), 34 categories, 38 images. Draft products await client-supplied images.

## Gotchas (all learned the hard way)

- **`sortBy` must be a Saleor `ProductOrder` object**, not a string. Use `toProductOrder()`. A bare `"DATE"` errors and silently returns no products.
- **`category(...)` takes no `channel` argument** — passing one makes it 404. `CATEGORY_DETAIL_QUERY` is channel-free.
- **`ProductInput` (update) rejects `productType`** — only `ProductCreateInput` accepts it. Strip it on update (see migration script).
- **Checkout completion flow.** `src/app/api/checkout/complete/route.ts` uses `saleorAdmin` to run `transactionCreate` (HANDLE_PAYMENTS, records AUTHORIZED for full total) → `checkoutComplete`. Studio pickup is live. PesaPal + PayPal (`/api/payments/*`) are stubbed pending client sandbox creds.
- **Checkout needs BOTH billing + shipping, and `countryArea`.** `checkoutComplete` fails `BILLING_ADDRESS_NOT_SET` unless billing is set — `UPDATE_CHECKOUT_ADDRESS_MUTATION` sets shipping+billing in one call. `AddressInput.country` is a **CountryCode string** (not the UI's `{code,country}` object) — `updateAddress()` maps it. US addresses need `countryArea` (State), so the checkout form collects it.
- **Delivery method, not shipping method.** Use `checkoutDeliveryMethodUpdate(id, deliveryMethodId)` — one field takes a ShippingMethod **or** a Warehouse (click-and-collect) id. Collection points come from `checkout.availableCollectionPoints`. The old `checkoutShippingMethodUpdate` is gone.
- **`images.unoptimized: true` is permanent**, not dev-only. Vercel Hobby plan's 1,000 image optimization transformations/month quota was exhausted; Saleor Cloud already serves images via CloudFront CDN so no optimizer is needed. Do not remove this.
- **Next 16 image optimizer would block private IPs** (SSRF guard) → local Saleor (`127.0.0.1`) images 400 in dev. `unoptimized: true` also covers this case now.
- **Stale urql/Next cache**: after mutating Saleor data, the dev server's memoized urql client + Next fetch cache can serve stale pages — restart `npm run dev` (and `rm -rf .next`) to clear.
- **Two checkout impls exist:** `context/CheckoutContext.tsx` (live) vs `checkout/checkout-provider.tsx`. Confirm before editing.
- **Playwright testDir mismatch:** `playwright.config.ts` points to `./tests`, but `./e2e/` also contains spec files that won't run with `npm run test:e2e`. Add specs to `./tests/` if they should run in CI.
- **Scaffold-only dirs:** `app/[channel]/*`, `app/api/auth`, `app/(cart)`, `app/(checkout)`, `src/ui/components/*`, `src/gql/`.
- **GIF hover CSS pattern:** ProductCard always mounts the GIF `<Image>` in DOM with `opacity-0`/`opacity-100` class toggle (not conditional mount). Conditional mount causes `Node cannot be found in the current page` errors during rapid hover because next/image ref becomes stale.

## Conventions

- `@/*` → `src/*`. React Compiler on. Tailwind v4 (`app/globals.css`, `src/styles/brand.css`).
- `next/image` hosts allowlisted in `next.config.ts`: `**.saleor.cloud`, `**.mirumee.com`, `images.unsplash.com`, `localhost:8000` (dev). Add hosts there before using new image sources.
- Don't expose the Saleor admin/dashboard URL in public UI (removed from Header/Footer).
- WooCommerce URL redirects are in `next.config.ts` (`/shop/*`, `/product/:slug`, `/product-category/:slug`, `/my-account/*`).

## Status & next

- **Done:** catalog migration (local), storefront hardening (branding, search, PLP, category pages, account order-detail + add-address, auth-token fix), studio pickup (`/api/checkout/complete` live), hover GIF animations (53 GIFs in production).
- **Next (Phase 3):** payments — PesaPal (primary, KE) + PayPal (intl) — requires client sandbox credentials. Then Phase 4 (SEO/redirects) and Phase 5 (Saleor Cloud + Vercel deploy, domain cutover). Handoff: `PHASE-3-PAYMENTS-HANDOFF.md`.
