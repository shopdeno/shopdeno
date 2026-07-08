# Image Fix Plan

## What's Broken

### Problem 1 — Local Saleor partially broken (crop script had failures)

The bulk crop/deskew (`/tmp/crop-deskew-all.py`) ran but errored on many products. Current local state (77 products):

| State | Count | What it means |
|-------|-------|---------------|
| `CROP_DONE` | 30 | Images cropped successfully ✅ |
| `MIXED` | 8 | Partial crop — old `image_*` WC URLs AND new `fixed_/orig_` URLs coexist |
| `WC_ONLY` | 26 | Crop script never ran — original WC images still in place |
| `NO_IMAGES` | 7 | Products with 0 media (should be deleted) |
| `OTHER` | 6+ | Saleor `/thumbnail/ID/` API URLs — return 302, can break Next.js Image |

MIXED products (most broken): Amber Rose (Side View), Arafat, Boom Box, Deathrow, Dexxy, Kifaru II, Ooops, Pablo.

The `.next` cache has stale URLs pointing to now-deleted images → 404s in the browser.

### Problem 2 — Saleor Cloud has no matatu products

`store-drwvfcof.eu.saleor.cloud` has only 29 Saleor demo products (Monospace Tee, etc.). All product work was done against local Saleor. Vercel deployment → Cloud → demo data.

---

## Fix Steps

### Part A — Fix Local Saleor

#### A1. Re-run crop script

The existing crop script handles MIXED and WC_ONLY correctly — re-running it will:
- MIXED products: already-fixed check sees `image_*` → re-downloads all, deletes all, re-crops clean
- WC_ONLY products: same treatment
- CROP_DONE (30): already-fixed check fires → skipped

```bash
python3 /tmp/crop-deskew-all.py
```

#### A2. Delete 7 orphan products from local Saleor

These should have been deleted in the previous session but weren't:
- `beat-port-back-ongata-line-transporters-4062` (Beat Port Back)
- `manyanga-*` (Manyanga)
- `mastingo-*` (Mastingo)
- `matatu-kudandia-*` (duplicate of Kudandia)
- `nini` (test product)
- `smurfs-expresso-sacco-*` (Smurfs — no assets, renamed to Salt n Peppa)
- `versace-*` (Versace — deleted)

Script: `/tmp/delete-local-orphans.py` (to be written)

#### A3. Clear Next.js cache

```bash
pkill -f "next dev"
rm -rf .next
npm run dev
```

---

### Part B — Migrate to Saleor Cloud

#### B1. Run full migration pipeline against Cloud

```bash
export SALEOR_URL=https://store-drwvfcof.eu.saleor.cloud/graphql/
export SALEOR_EMAIL=<cloud-admin-email>
export SALEOR_PASSWORD=<cloud-admin-password>

node scripts/migrate-woo-to-saleor.mjs setup
node scripts/migrate-woo-to-saleor.mjs categories
node scripts/migrate-woo-to-saleor.mjs products
node scripts/migrate-woo-to-saleor.mjs images
node scripts/migrate-woo-to-saleor.mjs variant-images
node scripts/migrate-woo-to-saleor.mjs local-images
node scripts/migrate-woo-to-saleor.mjs create-local-products
node scripts/migrate-woo-to-saleor.mjs add-these
node scripts/migrate-woo-to-saleor.mjs add-these-swatches
node scripts/migrate-woo-to-saleor.mjs publish-drafts
```

All stages are idempotent. Source is WooCommerce REST API (`shop-deno-local.local`).

#### B2. Push cropped images to Cloud

Script: `scripts/push-crops-to-cloud.py` (to be written)

- Gets Cloud admin token via `tokenCreate`
- For each Cloud product with WC-style `image_*` URLs:
  - If `/tmp/fix/{slug}/` has pre-cropped files → upload those (avoids re-running OpenCV)
  - Else → run OpenCV crop inline
  - Delete old Cloud media → upload cropped → re-assign variants by position

#### B3. Delete demo products from Cloud

29 Saleor demo products (Monospace Tee etc.) — delete via GQL loop.

#### B4. Verify + redeploy

```bash
# Expect 60+ matatu products:
curl -X POST https://store-drwvfcof.eu.saleor.cloud/graphql/ \
  -H "Authorization: Bearer BWBF99UQuiG2U7qTzq413u3uypEiax" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ products(first:100, channel:\"default-channel\") { totalCount } }"}'

vercel --prod --force
```

---

## Order of Operations

1. **Part A first** — fixes local + regenerates clean `/tmp/fix/` outputs
2. **Part B** — Cloud migration uses those outputs

## Files to Write

| File | Purpose |
|------|---------|
| `/tmp/delete-local-orphans.py` | Delete 7 NO_IMAGES products from local Saleor |
| `scripts/push-crops-to-cloud.py` | Upload `/tmp/fix/` images to Cloud + delete WC thumbnails |

## Blocker for Part B

Need Saleor Cloud admin email + password (user has these).
