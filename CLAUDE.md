# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Next.js 16 (App Router, React 19) storefront on a **Saleor** GraphQL backend. It is replacing the client's WooCommerce shop (Dennis Muraguri — Nairobi matatu/sacco art prints). Saleor runs locally via `docker-compose up -d` (`http://localhost:8000`) or Saleor Cloud in prod. Full migration plan: `~/.claude/plans/peppy-zooming-zephyr.md`. Persistent context also in the Claude memory store (`catalyst-migration-context`, `catalyst-storefront-known-bugs`).

## Commands

```bash
npm run dev      # dev server on :3000 (needs NEXT_PUBLIC_SALEOR_API_URL set)
npm run build    # production build
npm run lint     # eslint (flat config)
npx tsc --noEmit # typecheck
docker-compose up -d          # local Saleor (api :8000; db/redis internal-only)
docker-compose logs -f api    # tail Saleor logs
# Catalog migration (WooCommerce -> Saleor), staged + idempotent:
node scripts/migrate-woo-to-saleor.mjs <setup|categories|products|images|all> [--limit N] [--status any] [--only <wooId>]
```

No test runner. Env required: copy `.env.example` → `.env`, set `NEXT_PUBLIC_SALEOR_API_URL` (client throws if unset). `NEXT_PUBLIC_SALEOR_CHANNEL` defaults to `default-channel`. Local Saleor admin: `admin@example.com` / `admin`.

## Architecture

**GraphQL layer.** `src/lib/saleor.ts` builds one memoized `urql` client (`getSaleorClient`) + a thin `saleorClient` wrapper (`.query`/`.mutation` → promises). It sets **`preferGetMethod: false`** (urql v5 defaults to GET for short queries; Saleor serves the GraphiQL HTML on GET, so every query silently fails without this). Auth token is read from the `saleor_auth_token` cookie via `src/lib/auth-token.ts`. GraphQL docs live in `src/graphql/` (`queries.ts`, `cart.ts`, `checkout.ts`, `auth.ts`), `gql`-tagged from `graphql-tag`, parsed at **runtime**. Do **not** re-add `babel.config.js` (kept as `.disabled`) — it makes Turbopack panic-loop.

**State via React Context.** Providers, each backed by Saleor mutations: `context/CartContext.tsx` (cart = a Saleor Checkout; id in `localStorage["cartId"]`; `useCart()`), `context/AuthContext.tsx` (`useAuth()`; token in the `saleor_auth_token` cookie — see below), `context/CheckoutContext.tsx` (`useCheckout()`). `app/providers.tsx` wraps Auth + Cart only; checkout pages provide `CheckoutProvider` themselves.

**Data fetching split.** Layout + top-level pages fetch server-side via `getSaleorClient()`. Interactive parts are `"use client"` via context hooks. Product/collection pages = `page.tsx` (server) + `*Client.tsx`/`ProductGrid.tsx` (client).

**Shared building blocks (reuse these):** `src/lib/site-config.ts` (brand name/tagline/description/urls, env-overridable — use instead of hardcoding "Store"), `src/lib/product-sort.ts` `toProductOrder(sort, channel)` (maps UI sort values → Saleor `ProductOrder` object), `src/components/ProductCard.tsx` (presentational tile for all grids), `src/components/SearchBox.tsx`.

**Routes.** Home, `/products` (PLP), `/search`, `/collections` + `/collections/[slug]`, `/categories/[slug]`, `/products/[slug]`, `/account` + `/account/login|register|addresses|addresses/new|orders/[id]`, `/checkout`.

## Migration (WooCommerce → Saleor)

`scripts/migrate-woo-to-saleor.mjs` reads WC REST (`http://shop-deno-local.local`, basic auth admin + app password) and writes Saleor GraphQL admin API. Stages: `setup` (Color attribute + two product types: `Matatu Art Print`, `Matatu Art Print (Color)`), `categories`, `products` (variants, $50 USD pricing, stock, publish state, SEO from `ssp_meta_*`, descriptions), `images` (`.avif`→jpg via macOS `sips`→ Saleor multipart upload). Idempotent by slug/SKU. Env-configurable (`WC_BASE`, `SALEOR_URL`, `CHANNEL`, `WAREHOUSE`, …) — point at Saleor Cloud to run against prod. **Done on local sandbox:** 74 products (34 published + 40 draft), 34 categories, 38 images. Draft products await client-supplied images.

## Gotchas (all learned the hard way)

- **`sortBy` must be a Saleor `ProductOrder` object**, not a string. Use `toProductOrder()`. A bare `"DATE"` errors and silently returns no products.
- **`category(...)` takes no `channel` argument** — passing one makes it 404. `CATEGORY_DETAIL_QUERY` is channel-free.
- **`ProductInput` (update) rejects `productType`** — only `ProductCreateInput` accepts it. Strip it on update (see migration script).
- **Checkout completion is real (Phase 3, pickup live).** `src/graphql/checkout.ts` uses `checkoutComplete` + the Transactions API. Server-side Route Handlers under `src/app/api/` hold a Saleor app token (`src/lib/saleor-server.ts`, `SALEOR_APP_TOKEN`, or local staff-login fallback) and run `transactionCreate` (HANDLE_PAYMENTS) → `checkoutComplete`. Studio pickup (`/api/checkout/complete`) records an AUTHORIZED transaction for the total (pay on collection). PesaPal + PayPal (`/api/payments/*`) are stubbed pending client sandbox creds.
- **Checkout needs BOTH billing + shipping, and `countryArea`.** `checkoutComplete` fails `BILLING_ADDRESS_NOT_SET` unless billing is set — `UPDATE_CHECKOUT_ADDRESS_MUTATION` now sets shipping+billing to the same address in one call. `AddressInput.country` is a **CountryCode string** (not the UI's `{code,country}` object) — `updateAddress()` maps it. US addresses need `countryArea` (State), so the checkout form collects it.
- **Delivery method, not shipping method.** Use `checkoutDeliveryMethodUpdate(id, deliveryMethodId)` — one field takes a ShippingMethod **or** a Warehouse (click-and-collect) id. Collection points come from `checkout.availableCollectionPoints`. The old `checkoutShippingMethodUpdate` is gone.
- **Next 16 image optimizer blocks private IPs** (SSRF guard) → local Saleor (`127.0.0.1`) images 400. `next.config.ts` sets `images.unoptimized` in **dev only**; prod (public Saleor Cloud host) keeps optimization.
- **LiteSpeed-style stale cache**: after deleting/mutating Saleor data, the dev server's memoized urql client + Next fetch cache can serve stale pages — restart `npm run dev` (and `rm -rf .next`) to clear.
- **Two checkout impls exist:** `context/CheckoutContext.tsx` (live) vs `checkout/checkout-provider.tsx`. Confirm before editing.
- **Scaffold-only dirs:** `app/[channel]/*`, `app/api/auth`, `app/(cart)`, `app/(checkout)`, `src/ui/components/*`, `src/gql/`.

## Conventions

- `@/*` → `src/*`. React Compiler on. Tailwind v4 (`app/globals.css`, `src/styles/brand.css`).
- `next/image` hosts allowlisted in `next.config.ts`: `**.saleor.cloud`, `**.mirumee.com`, `images.unsplash.com`, `localhost:8000` (dev). Add hosts there before using new image sources.
- Don't expose the Saleor admin/dashboard URL in public UI (removed from Header/Footer).

## Status & next

- **Done:** catalog migration (local), storefront hardening (branding, search, PLP, category pages, account order-detail + add-address, auth-token fix). See git / memory for detail.
- **Next (Phase 3):** payments — PesaPal (primary, KE) + PayPal (intl) + studio pickup (click-and-collect / offline), plus real `checkoutComplete`. Then Phase 4 (SEO/redirects) and Phase 5 (Saleor Cloud + Vercel deploy, domain cutover). Handoff: `PHASE-3-PAYMENTS-HANDOFF.md`.
