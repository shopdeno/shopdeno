#!/usr/bin/env node
/**
 * Optional keep-alive ping for the Render free-tier Saleor API.
 *
 * Hits GET /graphql/ (health check) + one cheap POST query. Intended for a
 * 10–14 min cron (GitHub Actions schedule or UptimeRobot) so the first real
 * visitor rarely pays the ~60s cold start.
 *
 * QUOTA WARNING: render.yaml runs TWO free services (api + worker) sharing
 * 750h/month. Pinging 24/7 keeps instances awake and can exceed the free
 * allowance. The catalog snapshot (public/catalog/*.json) already makes
 * browse immune to cold starts — treat this ping as optional polish, not the
 * fix. If quota bites, delete the cron and rely on the snapshot.
 *
 * Usage:
 *   SALEOR_URL=https://shopdeno-saleor-api.onrender.com/graphql/ node scripts/keepalive-saleor.mjs
 */
const SALEOR_URL =
  process.env.SALEOR_URL || process.env.NEXT_PUBLIC_SALEOR_API_URL || "";

if (!SALEOR_URL) {
  console.error("Set SALEOR_URL (or NEXT_PUBLIC_SALEOR_API_URL).");
  process.exit(1);
}

try {
  const health = await fetch(SALEOR_URL, { signal: AbortSignal.timeout(90_000) });
  console.log(`GET ${SALEOR_URL} → HTTP ${health.status}`);
  const res = await fetch(SALEOR_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "{ shop { name } products(channel:\"default-channel\", first:1) { totalCount } }" }),
    signal: AbortSignal.timeout(90_000),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors).slice(0, 300));
  console.log(`warmed: shop=${json.data?.shop?.name} products=${json.data?.products?.totalCount}`);
} catch (e) {
  console.error(`keepalive failed (backend may be waking): ${e.message}`);
  process.exit(1);
}
