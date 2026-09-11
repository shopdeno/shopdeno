# Self-host runbook: $0/mo (no card) — Render + Neon + Upstash + Supabase

## A. Create accounts (in this order, ~30 min)
1. **Neon** (neon.tech) — free project, region EU (Frankfurt). ✅ DONE
   (`shopdeno-saleor-prod`, `aws-eu-central-1`, `pg_trgm` enabled.)
   Use the **direct (unpooled)** connection string for Django.
2. **Upstash** (upstash.com) — free Redis DB, EU region. ✅ DONE
   (TLS `rediss://` verified with PING.)
3. **Supabase** (supabase.com) — free project EU. ✅ DONE
   (buckets `saleor-media` + `saleor-backups`, S3 keys verified RW.)
4. **Render** (dashboard.render.com) — free account, no card. ⬅ YOU ARE HERE
5. **Brevo** (brevo.com) — free account (300 emails/day). Verify sender
   `sales@shop.dennis-muraguri.co.ke`, create an SMTP key.
6. All secrets live in `hosting/.env.selfhosted` (git-ignored, chmod 600).

## B. Verify free-tier gotchas before depending on them
- Neon: confirm `pg_trgm` extension available (Saleor search needs it). ✅ DONE
- Supabase: confirm S3-compat keys can list/write the buckets. ✅ DONE
- Render free: sleeps after 15 min idle (~1 min wake), 750 hrs/month
  (one always-on service fits), 512 MB RAM, ephemeral disk.

## C. Prepare Neon (schema + superuser) ✅ DONE
- Full migration applied (144 tables), `pg_trgm` present.
- Superuser `admin@example.com` active + confirmed
  (password in `hosting/.env.selfhosted` as `SALEOR_STAFF_PASSWORD`).
- Render boots `migrate --noinput` on every start (no-op from here on).
- Original one-off commands kept for reference:

```
NEONDB=<direct-url>
docker exec -e DATABASE_URL="$NEONDB" my-catalyst-next-api-1 python /app/manage.py migrate --noinput
docker exec -e DATABASE_URL="$NEONDB" \
  -e DJANGO_SUPERUSER_EMAIL=admin@example.com \
  -e DJANGO_SUPERUSER_PASSWORD='<SALEOR_STAFF_PASSWORD from hosting/.env.selfhosted>' \
  my-catalyst-next-api-1 python /app/manage.py createsuperuser --noinput
```

## D. Deploy to Render (see hosting/RENDER-DEPLOY.md)
Dashboard -> New -> **Blueprint** -> connect `shopdeno/shopdeno`
(`render.yaml` at root). Fill prompted secrets from
`hosting/.env.selfhosted`. `ALLOWED_HOSTS` = the Render hostname
(e.g. `shopdeno-saleor-api.onrender.com`).

## E. Load catalog + cut over
1. `DST_URL=https://<service>.onrender.com/graphql/ DST_TOKEN=<staff-token> \
   node scripts/mirror-saleor-to-cloud.mjs all` (run from repo root;
   local Saleor at :8000 already holds all 70 products + media).
2. Verify counts + spot-check images in the dashboard.
3. Create "Storefront Payments" app (HANDLE_PAYMENTS + MANAGE_CHECKOUTS) ->
   token goes to Vercel `SALEOR_APP_TOKEN`.
4. Vercel: `NEXT_PUBLIC_SALEOR_API_URL` = new graphql URL. Redeploy.
5. Saleor dashboard -> Site Settings -> Allowed Client Hosts: add
   `https://shop.dennis-muraguri.co.ke` (+ vercel.app URL).
6. Re-register PesaPal IPN to the shop domain; update `PESAPAL_IPN_ID`.
7. GO-LIVE smoke checklist: /products (70), /saccos, /beba, PDP swatches,
   cart -> studio pickup -> confirmed, sitemap.xml, PesaPal test,
   PayPal micro-order + refund.
8. `next.config.ts`: add the Supabase media hostname to remotePatterns.

## E. Backups live from day one
1. Repo Settings -> Secrets -> Actions: add the five backup secrets
   (see `.github/workflows/backup.yml` header).
2. Actions -> saleor-nightly-backup -> Run workflow (manual test).
3. Monthly: restore drill to local docker (`pg_restore --clean`).

## If a free tier breaks
Neon/Upstash paid micro tiers or a HostPinnacle VPS later — same compose
shape, no re-architecture. Data always exportable via `pg_dump` + bucket sync.
