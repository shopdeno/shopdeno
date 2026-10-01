# ADR 0003 — PayPal must be sandbox-verified with a server-side capture net before going live

**Status:** Accepted
**Date:** 2026-09-28

## Context

PayPal is the international gateway. Today it runs on **LIVE production credentials that were
never sandbox-tested** (GO-LIVE.md notes "No sandbox test was done — place a real small order
and refund"). Capture happens only when the customer returns to `/checkout/return`, which
calls `/api/payments/paypal/capture` from the browser. There is **no PayPal webhook and no
reconciliation** — an approved-but-abandoned PayPal order is never captured server-side. So
PayPal has both unknown correctness (untested live path) and a structural completion hole
(PesaPal at least has the IPN + the ADR-0002 sweep; PayPal has nothing).

## Decision

Before live PayPal is enabled, in order:

1. **Sandbox-verify** initiate → approve → capture end-to-end; confirm the order appears in
   Saleor with a captured transaction of the correct amount.
2. **Add a server-side capture net** — a PayPal webhook (`CHECKOUT.ORDER.APPROVED` /
   `PAYMENT.CAPTURE.COMPLETED`, signature-verified) or an extension of the ADR-0002
   reconciliation sweep — so capture does not depend on the browser returning.
3. **Then** switch to live credentials.

Live PayPal is a **go-live blocker** until 1–3 pass. Launch may proceed KES-first (PesaPal +
studio pickup) with PayPal following.

## Consequences

- The capture route must be **idempotent** — dedupe by PayPal order id, mirroring how
  `completePesapalPayment` dedupes by `pspReference` — so the return path and the webhook/sweep
  can't double-capture.
- Adds PayPal dashboard webhook configuration + a verification secret to the env set.
- International buyers cannot pay by PayPal until this ships, if launching KES-first.
