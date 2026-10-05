import { NextResponse } from "next/server";
import { getPesapalStatus } from "@/lib/pesapal";
import { completePesapalPayment } from "@/app/api/payments/pesapal/ipn/route";

// GET /api/payments/pesapal/status?trackingId=X&checkoutId=Y
// Called by the return page after the customer comes back from PesaPal.
// Checks payment status and completes the checkout if paid (idempotent — safe
// to call even if the IPN handler already completed it).

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trackingId = searchParams.get("trackingId");
  const checkoutId = searchParams.get("checkoutId");

  if (!trackingId || !checkoutId) {
    return NextResponse.json({ error: "trackingId and checkoutId are required" }, { status: 400 });
  }

  try {
    const status = await getPesapalStatus(trackingId);

    if (status.payment_status_description === "Completed") {
      let result;
      try {
        result = await completePesapalPayment(checkoutId, trackingId, status.payment_method);
      } catch (err) {
        // PesaPal itself confirmed Completed, but the Saleor follow-up threw
        // (seen live 2026-10-05: querying a just-consumed checkout can fail with
        // a permissions error on the app token). The money is verified — confirm
        // the payment rather than showing "Payment Issue". IPN/reconcile own the
        // order record; `recovered` tells the return page the order number is unknown.
        console.error("PesaPal status: PSP-verified but Saleor follow-up threw:", err);
        return NextResponse.json({ confirmed: true, recovered: true });
      }

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        confirmed: true,
        orderId: result.orderId,
        orderNumber: result.orderNumber,
      });
    }

    if (
      status.payment_status_description === "Failed" ||
      status.payment_status_description === "Reversed"
    ) {
      return NextResponse.json({ error: `Payment ${status.payment_status_description.toLowerCase()}` });
    }

    // Pending — IPN not yet received
    return NextResponse.json({ pending: true });
  } catch (err) {
    console.error("PesaPal status check failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Status check failed" },
      { status: 500 }
    );
  }
}
