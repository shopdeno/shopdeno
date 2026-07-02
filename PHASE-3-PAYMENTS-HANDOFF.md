# Phase 3 kickoff — Payments & real checkout

Paste the block below into a fresh Claude Code session (run from
`.../Catalyst/my-catalyst-next`) to continue the WooCommerce → Saleor migration.

---

> **Progress (2026-07-01):** Steps 1 & 2 DONE and verified end-to-end (test orders
> #21/#22 placed against local Saleor 3.23.13). Real `checkoutComplete` + Transactions
> API wired via server Route Handlers (`src/lib/saleor-server.ts`,
> `src/app/api/checkout/complete/route.ts`); studio pickup (click-and-collect + offline
> "pay on collection" authorized transaction) is live in the checkout UI. Also fixed two
> latent blockers: billing address was never set (→ `BILLING_ADDRESS_NOT_SET`) and the
> form's State field was mis-bound / never sent `countryArea`. Delivery now uses
> `checkoutDeliveryMethodUpdate`. **Remaining: steps 3-5 (PesaPal, PayPal, return page) —
> need client sandbox creds.** `.env.example` has the placeholders; `/api/payments/*`
> routes are not built yet. Full plan:
> `~/.claude/plans/read-my-catalyst-next-phase-3-payments-h-gleaming-pillow.md`.

---

You are continuing the Dennis Muraguri storefront project (Next.js 16 + Saleor,
replacing a WooCommerce shop). Read `CLAUDE.md`, the plan at
`~/.claude/plans/peppy-zooming-zephyr.md`, and the Claude memory notes
`catalyst-migration-context` and `catalyst-storefront-known-bugs` before starting.

**State so far:** Catalog migration is done on the local docker Saleor (74 matatu
art products, 34 categories, images) via `scripts/migrate-woo-to-saleor.mjs`.
Storefront hardening is done (branding, `/products`, `/search`, category pages,
account order-detail + add-address, auth-token cookie fix). Local Saleor admin:
`admin@example.com` / `admin`. Start with `docker-compose up -d` then `npm run dev`.

**Your task — Phase 3: payments + working checkout.** Deliver, in order:

1. **Fix checkout completion.** `src/graphql/checkout.ts` uses
   `checkoutCompleteWithTransactionedPayment`, which is NOT a real Saleor
   mutation. Replace with the real flow: `checkoutComplete` plus Saleor's
   Transactions API. Update `context/CheckoutContext.tsx` `completeCheckout()`
   accordingly. Verify a checkout can complete and the order appears in the
   Saleor dashboard.

2. **Studio pickup (quick win, no gateway).** Enable Saleor click-and-collect
   (warehouse "Default for click and collect" already exists) as a delivery
   method, plus an offline "pay at studio" transaction. Wire it as a checkout
   option.

3. **PesaPal app (primary, Kenya — covers M-Pesa + cards).** Build a small
   Saleor payment/transaction app (webhook service; can live in a `payment-apps/`
   dir or as Vercel functions) integrating PesaPal API 3.0: submit order →
   redirect to PesaPal → IPN callback reports the transaction to Saleor
   (`transactionUpdate`/`transactionEventReport`) → `checkoutComplete`.

4. **PayPal app (international).** Analogous transaction app using PayPal REST
   (Orders v2) + webhook capture → Saleor transaction.

5. **Checkout UI.** Replace the payment-step placeholder in
   `src/app/checkout/CheckoutContent.tsx` with method selection (PesaPal /
   PayPal / Studio pickup) and handle the redirect + return.

**You will need from the user before external gateways work:** PesaPal consumer
key/secret (sandbox + prod) and PayPal REST client id/secret. Build against
sandbox first; ask for creds when you reach step 3/4.

**Constraints & known traps (see CLAUDE.md "Gotchas"):** `sortBy` must be a
`ProductOrder` object; `category()` takes no channel; `ProductInput` update
rejects `productType`; Next 16 image optimizer blocks private IPs (unoptimized
in dev); restart dev + `rm -rf .next` to clear stale Saleor cache; do NOT
re-add `babel.config.js`.

**Verify end-to-end:** place one sandbox order per method (pickup, PesaPal,
PayPal); each should complete and show in the Saleor dashboard with the correct
transaction status. Screenshot the checkout flow.

When Phase 3 is done, next is Phase 4 (SEO/redirects) then Phase 5 (provision
Saleor Cloud + Vercel, re-run the migration against prod, domain cutover).
