import { NextResponse } from "next/server";
import { paypalPost, paypalGet } from "@/lib/paypal";
import { completePaypalPayment } from "@/lib/paypal-complete";

// Handles PayPal server-to-server webhooks.
// Ensures orders complete even when the buyer never returns to /checkout/return.
//
// Register this URL in the PayPal Developer Dashboard → Webhooks.
// Set PAYPAL_WEBHOOK_ID env var to the webhook ID (required in production for
// signature verification).
//
// Event handled: PAYMENT.CAPTURE.COMPLETED

type PayPalCaptureEvent = {
  event_type: string;
  resource: {
    id: string;
    status: string;
    amount?: { currency_code: string; value: string };
    supplementary_data?: {
      related_ids?: { order_id?: string };
    };
  };
};

type PayPalOrderDetails = {
  purchase_units: Array<{
    custom_id?: string;
  }>;
  message?: string;
};

type VerifyWebhookResponse = {
  verification_status: string;
};

export async function POST(request: Request) {
  const rawBody = await request.text();

  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  if (webhookId) {
    try {
      const verification = await paypalPost<VerifyWebhookResponse>(
        "/v1/notifications/verify-webhook-signature",
        {
          auth_algo: request.headers.get("paypal-auth-algo"),
          cert_url: request.headers.get("paypal-cert-url"),
          transmission_id: request.headers.get("paypal-transmission-id"),
          transmission_sig: request.headers.get("paypal-transmission-sig"),
          transmission_time: request.headers.get("paypal-transmission-time"),
          webhook_id: webhookId,
          webhook_event: JSON.parse(rawBody) as unknown,
        }
      );

      if (verification.verification_status !== "SUCCESS") {
        return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
      }
    } catch (err) {
      console.error("PayPal webhook: signature verification error", err);
      return NextResponse.json({ error: "Signature verification error" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "PAYPAL_WEBHOOK_ID not configured" }, { status: 500 });
  }

  let event: PayPalCaptureEvent;
  try {
    event = JSON.parse(rawBody) as PayPalCaptureEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Only process completed captures; acknowledge all other events.
  if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
    return NextResponse.json({ received: true });
  }

  try {
    const captureId = event.resource?.id;
    const orderId = event.resource?.supplementary_data?.related_ids?.order_id;

    if (!captureId || !orderId) {
      console.error("PayPal webhook: missing resource.id or order_id", event.resource);
      return NextResponse.json({ received: true });
    }

    const order = await paypalGet<PayPalOrderDetails>(`/v2/checkout/orders/${orderId}`);
    if (order.message) {
      console.error("PayPal webhook: order lookup failed", order.message);
      return NextResponse.json({ received: true });
    }

    const checkoutId = order.purchase_units?.[0]?.custom_id;
    if (!checkoutId) {
      console.error("PayPal webhook: no custom_id on order", orderId);
      return NextResponse.json({ received: true });
    }

    const amount = parseFloat(event.resource.amount?.value ?? "0");
    const currency = event.resource.amount?.currency_code ?? "USD";

    const result = await completePaypalPayment(checkoutId, captureId, amount, currency);
    if (result.error) {
      console.error("PayPal webhook: Saleor completion failed", result.error);
    }
  } catch (err) {
    console.error("PayPal webhook error:", err);
  }

  // Always 200 — PayPal retries on non-2xx indefinitely.
  return NextResponse.json({ received: true });
}
