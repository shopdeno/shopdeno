# Payment Testing Plan

## Current state

| Flow | Status |
|------|--------|
| Collect (pay at studio) | ✅ Tested end-to-end via Playwright — places real Saleor orders |
| PesaPal (M-Pesa/card) | ❌ Cannot test — credentials not set in Vercel |
| PayPal (card) | ❌ Cannot test — credentials not set in Vercel |

The collect flow places real orders on Saleor Cloud (verified by order number in test output). PesaPal and PayPal routes are fully implemented but require sandbox credentials.

---

## To enable PayPal sandbox testing

1. Sign up at [developer.paypal.com](https://developer.paypal.com)
2. Create a sandbox app → copy Client ID + Secret
3. Add to Vercel env vars:
   ```
   PAYPAL_CLIENT_ID=<sandbox-client-id>
   PAYPAL_CLIENT_SECRET=<sandbox-secret>
   PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
   ```
4. Test card number: `4111111111111111`, any future expiry, any CVV
5. Or use PayPal sandbox buyer account (auto-created in developer.paypal.com)

---

## To enable PesaPal sandbox testing

1. Register at [developer.pesapal.com](https://developer.pesapal.com)
2. Get Consumer Key + Consumer Secret from sandbox dashboard
3. Add to Vercel env vars:
   ```
   PESAPAL_CONSUMER_KEY=<key>
   PESAPAL_CONSUMER_SECRET=<secret>
   PESAPAL_API_BASE=https://cybqa.pesapal.com/pesapalv3
   ```
4. After deploy, visit `GET /api/payments/pesapal/register-ipn` once to register the IPN webhook
5. Use PesaPal sandbox test cards/M-Pesa numbers per their documentation

---

## Return URL configuration

Both providers redirect back to `/checkout/return` after payment. Ensure the Vercel production domain is whitelisted in each provider's dashboard:
- PayPal: Allowed Return URLs → `https://my-catalyst-next.vercel.app/checkout/return`
- PesaPal: Callback URL → same

---

## Once credentials are set

Run the Playwright test suite to verify end-to-end card flows:
```bash
cd ~/.claude/skills/playwright
node run.js /tmp/playwright-checkout-test.js
```

The test file at `/tmp/playwright-checkout-test.js` can be extended with card payment flows once sandbox credentials are available.
