# ADR 0001 — PesaPal orders are charged in KES, converted from the USD channel total

**Status:** Accepted
**Date:** 2026-09-28

## Context

The storefront and the Saleor `default-channel` price everything in **USD** (a flat $50
per print). PesaPal — the primary Kenyan gateway (M-Pesa + cards) — settles in **KES**.

`src/app/api/payments/pesapal/initiate/route.ts` reads the checkout total server-side
(good — the amount is not client-supplied) but passes the checkout's `currency` and
`amount` through **unconverted**. It submits `{ amount: 50, currency: "USD" }` to a
KES-denominated M-Pesa account, which either errors or bills ~50 KES (~$0.38) instead of
~6,500 KES — a ~130× underpayment. This blocks go-live.

Alternatives considered and rejected:
- **USD-enabled PesaPal account (passthrough):** relies on PesaPal auto-converting; not how
  the account is set up, and unverified.
- **Reprice everything in KES:** re-migrate the Saleor channel to KES. Removes FX entirely
  but is a large change and breaks the USD international/PayPal path.

## Decision

Keep **USD** as the display/channel currency. Convert **USD → KES** server-side inside
PesaPal `initiate` before `SubmitOrderRequest`, and submit `currency: "KES"` with the
converted, rounded amount. PayPal continues to charge USD unconverted.

## Consequences

- **Conversion-rate source (decided):** a live mid-market rate **fetched once daily and
  cached**, applied with a small buffer, with a **fixed `USD_KES_RATE` env fallback** when the
  feed is unavailable. `initiate` reads the cached rate only — the payment path never makes a
  live FX call. Refresh via a daily cron (can share the ADR-0002 reconciliation schedule).
- Rounding rules must be defined (KES has no minor unit in practice for M-Pesa).
- Receipts, refunds, and the PesaPal IPN reconciliation are all in KES; the Saleor
  transaction is recorded against a USD order total — the two must be reconciled at the
  FX rate used, and the rate used should be persisted on the transaction for auditability.
- Rate drift between the price the customer saw (USD) and the KES charged is possible if the
  rate moves between page render and payment; acceptable for a low-volume art shop.
