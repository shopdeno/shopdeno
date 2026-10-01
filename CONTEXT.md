# Domain Context — Dennis Muraguri Storefront (Catalyst / Saleor)

Domain terminology for the Next.js + Saleor storefront that replaces the WooCommerce shop.
Terms here are the canonical vocabulary — use them in code, issues, and ADRs.

## Currency & payments

- **Display currency** — **USD**. All storefront prices and the Saleor `default-channel`
  total are in USD (currently a flat $50 per print).
- **Settlement currency (Kenya)** — **KES**. PesaPal / M-Pesa charge the customer in KES.
  The USD checkout total **must be converted to KES** before it is submitted to PesaPal.
- **Settlement currency (international)** — **USD**, charged via PayPal (no conversion).
- **FX conversion boundary** — the single server-side point where the USD total becomes a
  KES charge: PesaPal `initiate` (`src/app/api/payments/pesapal/initiate/route.ts`).
  Conversion never happens client-side. See ADR 0001.
- **FX rate** — live mid-market rate cached daily (+ small buffer), with a fixed `USD_KES_RATE`
  env fallback. Never fetched on the payment path; `initiate` reads the cached value. ADR 0001.
  Persist the rate used on each transaction for reconciliation.
- **Gateway** — an external payment provider. Two are live: **PesaPal** (primary, Kenya,
  covers M-Pesa + cards) and **PayPal** (international). **Studio pickup** ("pay on
  collection") is a gateway-less offline flow, not a gateway.

## Checkout completion

- **Completion** — converting a paid Saleor **Checkout** into an **Order** (`checkoutComplete`).
  The idempotent entrypoint is `completePesapalPayment()`; safe to call from multiple triggers.
- **IPN (Instant Payment Notification)** — PesaPal's server-to-server callback confirming a
  payment. Registered once and **must target the `shop.` domain**; it drives completion when
  the customer pays on their phone and never returns to the browser.
- **Return path** — the browser-side completion trigger when the customer comes back to
  `/checkout/return`.
- **Reconciliation** — a scheduled sweep that completes paid-but-open checkouts the IPN and
  return paths missed. See ADR 0002. PayPal currently has **no** server-side equivalent.
- **Capture** — PayPal's money-movement step, today triggered only from the return page. Must
  be idempotent (dedupe by PayPal order id) and backed by a webhook/sweep before live. ADR 0003.
