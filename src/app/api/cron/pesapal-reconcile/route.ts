import { NextResponse } from "next/server";
import { runPesapalReconciliation } from "@/lib/pesapal-reconcile";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron (every 15 min) — closes paid PesaPal checkouts that were missed
// by both the return page and the IPN (M-Pesa close-tab pattern).
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
    const result = await runPesapalReconciliation();
    return NextResponse.json(
      { ok: true, ...result },
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
