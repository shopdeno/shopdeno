import { NextResponse } from "next/server";
import { runPesapalReconciliation } from "@/lib/pesapal-reconcile";
import { refreshUsdToKesRate } from "@/lib/fx";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron (daily `0 1 * * *` — Hobby cap) — closes paid PesaPal checkouts
// that were missed by both the return page and the IPN (M-Pesa close-tab pattern).
// Also pre-warms the USD→KES /tmp cache so the payment path rarely live-fetches.
// Auth: same CRON_SECRET as the keepalive route.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    // FX pre-warm is best-effort: a dead feed must never fail reconciliation.
    // USD_KES_RATE env (if set) wins at payment time regardless of cache state.
    let fxPrewarmed: number | null = null;
    try {
      fxPrewarmed = await refreshUsdToKesRate();
    } catch (err) {
      console.warn("FX pre-warm failed (payment path still has env+feeds):", err);
    }
    const result = await runPesapalReconciliation();
    return NextResponse.json(
      { ok: true, ...result, fxPrewarmed },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("PesaPal reconciliation cron failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "reconciliation failed" },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
