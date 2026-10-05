import { NextResponse } from "next/server";
import { getPesapalStatus, requestPesapalRefund } from "@/lib/pesapal";

export const dynamic = "force-dynamic";

// Ops-only PesaPal refund filing. NOT linked from any UI — call it with curl.
// Auth: CRON_SECRET bearer (same secret as the cron routes; lives in Vercel
// prod env + the workspace .env, never in client code).
//
// Usage:
//   curl -X POST https://shop.dennis-muraguri.co.ke/api/admin/pesapal-refund \
//     -H "Authorization: Bearer $CRON_SECRET" \
//     -H "Content-Type: application/json" \
//     -d '{"trackingId":"<uuid>","reason":"<why>"}'
//
// Rules enforced here (PesaPal constraints): payment must be COMPLETED, refund
// is ALWAYS the full KES amount (mobile money cannot be partial). A "200" from
// PesaPal means the request was RECEIVED — money moves only after merchant /
// finance approval in their queue. One refund per payment.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "refunds not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { trackingId?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { trackingId, reason } = body;
  if (!trackingId || typeof trackingId !== "string") {
    return NextResponse.json({ error: "trackingId is required" }, { status: 400 });
  }
  if (!reason || reason.trim().length < 8) {
    return NextResponse.json(
      { error: "reason is required (min 8 chars) — it goes to PesaPal finance" },
      { status: 400 }
    );
  }

  try {
    const status = await getPesapalStatus(trackingId);
    if (status.payment_status_description !== "Completed") {
      return NextResponse.json(
        { error: `Only COMPLETED payments can be refunded (current: ${status.payment_status_description})` },
        { status: 400 }
      );
    }
    if (!status.confirmation_code) {
      return NextResponse.json(
        { error: "PesaPal returned no confirmation code for this payment" },
        { status: 502 }
      );
    }

    const result = await requestPesapalRefund({
      confirmationCode: status.confirmation_code,
      amount: status.amount, // full amount — mobile money cannot be partial
      username: "store-ops",
      remarks: reason.trim().slice(0, 200),
    });

    console.log("PesaPal refund filed", {
      trackingId,
      amount: status.amount,
      currency: status.currency,
      result,
    });
    return NextResponse.json(
      {
        filed: result.status === "200",
        amount: status.amount,
        currency: status.currency,
        message: result.message,
        note: "Request received by PesaPal — funds move after merchant/finance approval. Track it in the PesaPal dashboard.",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("PesaPal refund filing failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Refund filing failed" },
      { status: 502 }
    );
  }
}
