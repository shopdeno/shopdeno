import { NextResponse } from "next/server";
import { paypalPost, paypalGet } from "@/lib/paypal";
import { completePaypalPayment } from "@/lib/paypal-complete";

// POST { paypalOrderId }
// Called by /checkout/return after PayPal redirects back with ?token={paypalOrderId}.
// Idempotent: if the order was already captured (e.g. webhook beat the return page),
// we skip the capture and proceed straight to Saleor completion.

type PayPalOrderDetails = {
  id: string;
  status: string;
  purchase_units: Array<{
    custom_id?: string;
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount: { currency_code: string; value: string };
      }>;
    };
  }>;
  message?: string;
};

type PayPalCaptureResponse = {
  id: string;
  status: string;
  purchase_units: Array<{
    custom_id?: string;
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount: { currency_code: string; value: string };
      }>;
    };
  }>;
  name?: string;
  details?: Array<{ issue?: string }>;
  message?: string;
};

export async function POST(request: Request) {
  let paypalOrderId: string | undefined;
  try {
    const body = await request.json();
    paypalOrderId = body?.paypalOrderId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!paypalOrderId) {
    return NextResponse.json({ error: "paypalOrderId is required" }, { status: 400 });
  }

  try {
    // Fetch order details to get checkoutId (stored as custom_id) and current status.
    const details = await paypalGet<PayPalOrderDetails>(`/v2/checkout/orders/${paypalOrderId}`);
    if (details.message) {
      return NextResponse.json({ error: details.message }, { status: 400 });
    }

    const checkoutId = details.purchase_units?.[0]?.custom_id;
    if (!checkoutId) {
      return NextResponse.json({ error: "No checkoutId found in PayPal order" }, { status: 400 });
    }

    let captureRecord: { id: string; status: string; amount: { currency_code: string; value: string } } | undefined;

    if (details.status === "COMPLETED") {
      // Already captured (e.g. webhook ran first) — use existing capture record.
      captureRecord = details.purchase_units?.[0]?.payments?.captures?.[0];
    } else {
      // Capture the payment.
      const capture = await paypalPost<PayPalCaptureResponse>(
        `/v2/checkout/orders/${paypalOrderId}/capture`,
        {}
      );

      if (capture.name === "UNPROCESSABLE_ENTITY" &&
          capture.details?.some((d) => d.issue === "ORDER_ALREADY_CAPTURED")) {
        // Webhook beat us — re-fetch to get the capture record.
        const refreshed = await paypalGet<PayPalOrderDetails>(`/v2/checkout/orders/${paypalOrderId}`);
        captureRecord = refreshed.purchase_units?.[0]?.payments?.captures?.[0];
      } else if (capture.message) {
        return NextResponse.json({ error: capture.message, raw: capture }, { status: 400 });
      } else {
        captureRecord = capture.purchase_units?.[0]?.payments?.captures?.[0];
      }
    }

    if (!captureRecord || captureRecord.status !== "COMPLETED") {
      return NextResponse.json(
        { error: `Capture status: ${captureRecord?.status ?? "unknown"}` },
        { status: 400 }
      );
    }

    const amount = parseFloat(captureRecord.amount.value);
    const currency = captureRecord.amount.currency_code;

    const result = await completePaypalPayment(checkoutId, captureRecord.id, amount, currency);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      orderId: result.orderId ?? checkoutId,
      orderNumber: result.orderNumber,
    });
  } catch (err) {
    console.error("PayPal capture failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment capture failed" },
      { status: 500 }
    );
  }
}
