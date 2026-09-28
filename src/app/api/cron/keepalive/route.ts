import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron (see vercel.json) hits this every 12 min to keep the Render
// free-tier Saleor API warm, so first-visitor checkout/cart actions rarely
// pay the ~60s cold start. Browse pages don't need it — they're covered by
// the catalog snapshot + ISR.
//
// QUOTA NOTE: Render free gives 750 instance-hours/month shared by the api +
// worker services. Pinging only the API keeps it near ~730h/month (inside
// the allowance) while the worker still sleeps except when actually needed
// (thumbnails, mail, scheduled tasks). If Render ever reports over-quota,
// delete the `crons` entry in vercel.json — the storefront degrades to
// snapshot mode, which is the designed fallback.
//
// Auth: when CRON_SECRET is set in Vercel env, Vercel Cron sends
// `Authorization: Bearer <CRON_SECRET>` automatically; the check below
// rejects anyone else. Until the secret is set the route stays open (the
// ping itself is harmless and unauthenticated Saleor reads are public).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const saleorUrl =
    process.env.SALEOR_URL || process.env.NEXT_PUBLIC_SALEOR_API_URL || "";
  if (!saleorUrl) {
    return NextResponse.json({ error: "no Saleor URL configured" }, { status: 500 });
  }

  try {
    // Cheap anonymous query — enough to wake/keep the container + Neon link.
    // Saleor serves the GraphiQL playground HTML on GET, so this must POST.
    const res = await fetch(saleorUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "{ shop { name } }" }),
      signal: AbortSignal.timeout(55_000),
    });
    const json = await res.json();
    if (json.errors) throw new Error("Saleor returned errors");
    return NextResponse.json(
      { ok: true, shop: json.data?.shop?.name ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    // 502 (not 500) so Vercel Cron logs show the backend — not the route —
    // as the failure; a sleeping backend mid-wake is expected occasionally.
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "ping failed" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
