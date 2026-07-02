import { NextResponse } from "next/server";
import { saleorAdmin } from "@/lib/saleor-server";
import { paypalPost, paypalGet } from "@/lib/paypal";
import { TRANSACTION_CREATE } from "@/graphql/transactions";
import { CHECKOUT_COMPLETE_MUTATION } from "@/graphql/checkout";

// POST { paypalOrderId }
// Called by /checkout/return after PayPal redirects back with ?token={paypalOrderId}.
// Captures the PayPal order, records a CHARGED transaction in Saleor, completes checkout.

type PayPalOrderDetails = {
  id: string;
  status: string;
  purchase_units: Array<{
    custom_id?: string;
    amount: { currency_code: string; value: string };
  }>;
  message?: string;
};

type PayPalCaptureResponse = {
  id: string;
  status: string;
  purchase_units: Array<{
    custom_id?: string;
    payments: {
      captures: Array<{
        id: string;
        amount: { currency_code: string; value: string };
        status: string;
      }>;
    };
  }>;
  message?: string;
};

type TransactionCreateResult = {
  transactionCreate: {
    transaction: { id: string } | null;
    errors: Array<{ field: string | null; message: string; code: string }>;
  };
};

type CheckoutCompleteResult = {
  checkoutComplete: {
    order: { id: string; number: string } | null;
    confirmationNeeded: boolean;
    errors: Array<{ field: string | null; message: string; code: string }>;
  };
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
    // Fetch order details first to get the checkoutId from custom_id.
    const details = await paypalGet<PayPalOrderDetails>(`/v2/checkout/orders/${paypalOrderId}`);
    if (details.message) {
      return NextResponse.json({ error: details.message }, { status: 400 });
    }

    const checkoutId = details.purchase_units?.[0]?.custom_id;
    if (!checkoutId) {
      return NextResponse.json({ error: "No checkoutId found in PayPal order" }, { status: 400 });
    }

    // Capture the payment.
    const capture = await paypalPost<PayPalCaptureResponse>(
      `/v2/checkout/orders/${paypalOrderId}/capture`,
      {}
    );

    if (capture.message) {
      return NextResponse.json({ error: capture.message, raw: capture }, { status: 400 });
    }

    const captureUnit = capture.purchase_units?.[0];
    const captureRecord = captureUnit?.payments?.captures?.[0];
    if (!captureRecord || captureRecord.status !== "COMPLETED") {
      return NextResponse.json(
        { error: `Capture status: ${captureRecord?.status ?? "unknown"}`, raw: capture },
        { status: 400 }
      );
    }

    const amount = parseFloat(captureRecord.amount.value);
    const currency = captureRecord.amount.currency_code;
    const pspReference = captureRecord.id;

    // Record charged transaction in Saleor.
    const txn = await saleorAdmin<TransactionCreateResult>(TRANSACTION_CREATE, {
      id: checkoutId,
      transaction: {
        name: "PayPal — card / wallet payment",
        pspReference,
        availableActions: ["REFUND"],
        amountCharged: { amount, currency },
      },
      transactionEvent: {
        message: `PayPal capture confirmed (${pspReference})`,
        pspReference,
      },
    });

    if (txn.transactionCreate.errors.length) {
      return NextResponse.json({ error: txn.transactionCreate.errors[0].message }, { status: 400 });
    }

    // Complete the Saleor checkout → order.
    const completion = await saleorAdmin<CheckoutCompleteResult>(CHECKOUT_COMPLETE_MUTATION, {
      checkoutId,
    });

    const { order, errors } = completion.checkoutComplete;
    if (errors.length) {
      if (errors[0].code === "CHECKOUT_NOT_FOUND") {
        // Already completed — treat as success (idempotent).
        return NextResponse.json({ orderId: checkoutId });
      }
      return NextResponse.json({ error: errors[0].message }, { status: 400 });
    }
    if (!order) {
      return NextResponse.json({ error: "Order not created" }, { status: 500 });
    }

    return NextResponse.json({ orderId: order.id, orderNumber: order.number });
  } catch (err) {
    console.error("PayPal capture failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment capture failed" },
      { status: 500 }
    );
  }
}
