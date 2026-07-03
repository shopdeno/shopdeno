# Go-Live Reference

**Deployed:** 2026-07-03  
**Storefront:** https://my-catalyst-next.vercel.app (Vercel · shop-deno team)  
**Saleor Cloud:** https://store-drwvfcof.eu.saleor.cloud/dashboard  
**Target domain:** https://shop.dennis-muraguri.co.ke

---

## Infrastructure

| Service | Details |
|---------|---------|
| Storefront | Next.js 16 on Vercel (shop-deno/my-catalyst-next) |
| Backend | Saleor Cloud free tier — `store-drwvfcof.eu.saleor.cloud` |
| Channel | `default-channel` (USD) |
| Vercel app token | `SALEOR_APP_TOKEN` — "Storefront Payments" app (HANDLE_PAYMENTS + MANAGE_CHECKOUTS) |
| PesaPal IPN ID | `193518d5-bc21-4eba-b456-da2fbd37b1ae` |
| PayPal | LIVE production creds — real money, monitor dashboard |

---

## Remaining steps (as of 2026-07-03)

### 1. DNS — HostPinnacle (5 min)
Login: hostpinnacle.co.ke → DNS Manager → `dennis-muraguri.co.ke`

Add record:
```
Type: A
Name: shop
Value: 76.76.21.21
TTL: 300
```

Vercel auto-provisions SSL once DNS propagates (5–30 min).

### 2. Saleor CORS (2 min)
Saleor Cloud dashboard → Configuration → Site Settings → Allowed Client Hosts → add:
- `https://shop.dennis-muraguri.co.ke`

### 3. Redeploy after DNS (to pick up correct SITE_URL for PesaPal callbacks)
`NEXT_PUBLIC_SITE_URL` is already set to `https://shop.dennis-muraguri.co.ke` on Vercel.
The PesaPal IPN URL registered is `https://dennis-muraguri.co.ke/api/payments/pesapal/ipn` — re-register after DNS is live if PesaPal rejects callbacks:
```
GET https://shop.dennis-muraguri.co.ke/api/payments/pesapal/register-ipn
```
Update `PESAPAL_IPN_ID` in Vercel env vars if a new ID is returned.

### 4. Smoke test checklist
- [ ] `https://shop.dennis-muraguri.co.ke` loads
- [ ] `/products` — 77 prints visible, sort works
- [ ] `/saccos` — SACCO wave cards
- [ ] `/beba` — Beba prints
- [ ] Product detail — colour swatches, image cycling, breadcrumb
- [ ] Add to cart → checkout → studio pickup → "Order Confirmed"
- [ ] `https://shop.dennis-muraguri.co.ke/sitemap.xml` — valid XML
- [ ] PesaPal: place test order → redirects to PesaPal → returns to `/checkout/return`
- [ ] Footer links — all 7 legal pages load
- [ ] `/attire` — coming soon page

### 5. PayPal test (⚠️ LIVE creds)
No sandbox test was done — PayPal creds are production. Place a real small order and refund immediately via PayPal dashboard (paypal.com, account: desmurr@yahoo.com).

---

## Vercel env vars (all set)

| Var | Status |
|-----|--------|
| `NEXT_PUBLIC_SALEOR_API_URL` | ✅ `https://store-drwvfcof.eu.saleor.cloud/graphql/` |
| `NEXT_PUBLIC_SALEOR_CHANNEL` | ✅ `default-channel` |
| `NEXT_PUBLIC_SITE_URL` | ✅ `https://shop.dennis-muraguri.co.ke` |
| `SALEOR_APP_TOKEN` | ✅ set |
| `PESAPAL_CONSUMER_KEY` | ✅ set |
| `PESAPAL_CONSUMER_SECRET` | ✅ set |
| `PESAPAL_API_BASE` | ✅ `https://pay.pesapal.com/v3` |
| `PESAPAL_IPN_ID` | ✅ `193518d5-bc21-4eba-b456-da2fbd37b1ae` |
| `PAYPAL_CLIENT_ID` | ✅ set |
| `PAYPAL_CLIENT_SECRET` | ✅ set |
| `PAYPAL_API_BASE` | ✅ `https://api-m.paypal.com` |

---

## Key URLs

| What | URL |
|------|-----|
| Live storefront | https://my-catalyst-next.vercel.app |
| Vercel dashboard | https://vercel.com/shop-deno/my-catalyst-next |
| Saleor dashboard | https://store-drwvfcof.eu.saleor.cloud/dashboard |
| PayPal dashboard | https://paypal.com (desmurr@yahoo.com) |
| PesaPal dashboard | https://pay.pesapal.com |
| HostPinnacle DNS | https://hostpinnacle.co.ke |

---

## Migration script (if re-run needed)

```bash
cd my-catalyst-next
# Point at Saleor Cloud (already set in .env)
node scripts/migrate-woo-to-saleor.mjs setup
node scripts/migrate-woo-to-saleor.mjs categories
node scripts/migrate-woo-to-saleor.mjs products
node scripts/migrate-woo-to-saleor.mjs images
node scripts/migrate-woo-to-saleor.mjs variant-images
node scripts/migrate-woo-to-saleor.mjs publish-drafts
node scripts/migrate-woo-to-saleor.mjs local-images
node scripts/migrate-woo-to-saleor.mjs create-local-products
node scripts/migrate-woo-to-saleor.mjs add-these
node scripts/migrate-woo-to-saleor.mjs add-these-swatches
```
All stages are idempotent.
