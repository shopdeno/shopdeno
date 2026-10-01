# ADR 0002 — PesaPal order completion has three idempotent paths

**Status:** Accepted
**Date:** 2026-09-28

## Context

PesaPal is the primary (Kenyan) gateway. M-Pesa STK push completes **on the customer's
phone**; on mobile the customer frequently never returns to the browser tab, so the
return-page completion path (`/checkout/return` → `/api/payments/pesapal/status`) often
never runs. That leaves the server-to-server **IPN** as the only completion trigger — and
the registered IPN URL points at apex `dennis-muraguri.co.ke` while the app serves at
`shop.dennis-muraguri.co.ke`, so the callback hits the wrong host. Result: customer charged
on the phone, no order created.

`completePesapalPayment()` (in `pesapal/ipn/route.ts`) is already idempotent — it dedupes
the Saleor transaction by `pspReference` and treats an already-completed checkout as done —
so it is safe to invoke from multiple triggers.

## Decision

Complete PesaPal orders through **three idempotent paths**, all calling
`completePesapalPayment()`:

1. **Return page** (`/status`) — fast path when the customer does return.
2. **Server IPN** — registered against the **`shop.` domain**. Fixing `PESAPAL_IPN_ID`
   registration is a **go-live blocker**, verified with a "pay via M-Pesa, close the tab
   before returning, confirm the order still appears" test.
3. **Reconciliation cron** (~15 min) — finds PesaPal payments reported `Completed` whose
   Saleor checkout is still open and finalizes them. Survives IPN outages/misregistration.

## Consequences

- The cron needs to **discover in-flight PesaPal payments**. Recommended: create the Saleor
  transaction as **PENDING at `initiate` time** (pspReference = `orderTrackingId`), so
  reconciliation can query Saleor for checkouts carrying a pending PesaPal transaction and
  re-check each against PesaPal. Today the transaction is only created at completion, so the
  trackingId↔checkoutId mapping is otherwise lost once the browser closes.
- Adds a second scheduled job alongside the existing `keepalive` cron (Vercel free-tier
  cron/compute budget — keep the query cheap).
- Idempotency across all three paths is already guaranteed; no double transactions.
- Recording the charged amount stays in the ADR-0001 currency scope: the transaction records
  the USD order total while PesaPal charged KES — persist the FX rate used for reconciliation.
