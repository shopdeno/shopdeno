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
      const result = await completePesapalPayment(checkoutId, trackingId);

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
