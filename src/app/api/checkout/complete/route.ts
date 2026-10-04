import { NextResponse } from "next/server";
import { gql } from "graphql-tag";
import { saleorAdmin } from "@/lib/saleor-server";
import { TRANSACTION_CREATE } from "@/graphql/transactions";
import { CHECKOUT_COMPLETE_MUTATION } from "@/graphql/checkout";
import { sendOrderConfirmationEmail, type OrderEmailLine } from "@/lib/order-email";

// Studio pickup / offline completion. Records an AUTHORIZED transaction covering
// the full total (money collected on collection at the studio), which flips the
// checkout's authorizeStatus to FULL, then completes it into an order.

// Pulls everything needed BOTH to authorize the transaction and to build the
// confirmation email, in one round-trip, while the checkout still exists.
const CHECKOUT_SUMMARY_QUERY = gql`
  query CheckoutSummary($checkoutId: ID!) {
    checkout(id: $checkoutId) {
      id
      email
      isShippingRequired
      billingAddress {
        firstName
      }
      shippingAddress {
        firstName
      }
      totalPrice {
        gross {
          amount
          currency
        }
      }
      lines {
        quantity
        unitPrice {
          gross {
            amount
            currency
          }
        }
        variant {
          name
          product {
            name
          }
        }
      }
      deliveryMethod {
        __typename
        ... on ShippingMethod {
          name
        }
        ... on Warehouse {
          name
        }
      }
    }
  }
`;

type CheckoutSummaryResult = {
  checkout: {
    id: string;
    email: string | null;
    isShippingRequired: boolean;
    billingAddress: { firstName: string | null } | null;
    shippingAddress: { firstName: string | null } | null;
    totalPrice: { gross: { amount: number; currency: string } };
    lines: Array<{
      quantity: number;
      unitPrice: { gross: { amount: number; currency: string } };
      variant: { name: string | null; product: { name: string } } | null;
    }>;
    deliveryMethod: { __typename: string; name?: string } | null;
  } | null;
};

type TransactionCreateResult = {
  transactionCreate: {
    transaction: { id: string } | null;
    errors: Array<{ field: string | null; message: string; code: string }>;
  };
};

type CheckoutCompleteResult = {
  checkoutComplete: {
    order: { id: string; number: string; status: string } | null;
    confirmationNeeded: boolean;
    errors: Array<{ field: string | null; message: string; code: string }>;
  };
};

export async function POST(request: Request) {
  let checkoutId: string | undefined;
  try {
    const body = await request.json();
    checkoutId = body?.checkoutId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!checkoutId) {
    return NextResponse.json({ error: "checkoutId is required" }, { status: 400 });
  }

  try {
    // 1. Read the authoritative total + order details server-side (never trust
    //    client amounts). Captured now because the checkout is consumed on complete.
    const { checkout } = await saleorAdmin<CheckoutSummaryResult>(CHECKOUT_SUMMARY_QUERY, {
      checkoutId,
    });
    if (!checkout) {
      return NextResponse.json({ error: "Checkout not found" }, { status: 404 });
    }
    const { amount, currency } = checkout.totalPrice.gross;

    // 2. Record an authorized transaction for the full amount.
    const txn = await saleorAdmin<TransactionCreateResult>(TRANSACTION_CREATE, {
      id: checkoutId,
      transaction: {
        name: "Studio pickup — pay on collection",
        pspReference: `pickup-${Date.now()}`,
        availableActions: ["CHARGE", "CANCEL"],
        amountAuthorized: { amount, currency },
      },
      transactionEvent: {
        message: "Order placed for studio pickup; payment due on collection.",
        pspReference: `pickup-${Date.now()}`,
      },
    });
    if (txn.transactionCreate.errors.length) {
      return NextResponse.json(
        { error: txn.transactionCreate.errors[0].message },
        { status: 400 }
      );
    }

    // 3. Complete the checkout into an order.
    const completion = await saleorAdmin<CheckoutCompleteResult>(CHECKOUT_COMPLETE_MUTATION, {
      checkoutId,
    });
    const { order, confirmationNeeded, errors } = completion.checkoutComplete;
    if (errors.length) {
      return NextResponse.json({ error: errors[0].message }, { status: 400 });
    }
    if (confirmationNeeded || !order) {
      return NextResponse.json(
        { error: "Checkout could not be completed" },
        { status: 400 }
      );
    }

    // 4. Send the confirmation email synchronously via Resend (NOT via the Saleor
    //    worker). Must never fail the order — the order already exists.
    await sendConfirmation(checkout, order.number);

    return NextResponse.json({ orderId: order.id, orderNumber: order.number });
  } catch (err) {
    console.error("Pickup completion failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Completion failed" },
      { status: 500 }
    );
  }
}

// Fire-and-log the confirmation email. Swallows all failures so a mail problem
// can never roll back or 500 a successfully created order.
async function sendConfirmation(
  checkout: NonNullable<CheckoutSummaryResult["checkout"]>,
  orderNumber: string
): Promise<void> {
  if (!checkout.email) {
    console.warn(`Order ${orderNumber}: no email on checkout, skipping confirmation.`);
    return;
  }
  const lines: OrderEmailLine[] = checkout.lines.map((l) => ({
    name: l.variant?.product.name ?? l.variant?.name ?? "Art print",
    quantity: l.quantity,
    amount: l.unitPrice.gross.amount,
    currency: l.unitPrice.gross.currency,
  }));
  const isPickup =
    checkout.deliveryMethod?.__typename === "Warehouse" || !checkout.isShippingRequired;

  const result = await sendOrderConfirmationEmail({
    to: checkout.email,
    customerName:
      checkout.billingAddress?.firstName || checkout.shippingAddress?.firstName || null,
    orderNumber,
    lines,
    total: checkout.totalPrice.gross,
    delivery: isPickup ? "pickup" : "ship",
    deliveryName: checkout.deliveryMethod?.name ?? null,
  });
  if (!result.ok) {
    console.error(`Order ${orderNumber}: confirmation email failed — ${result.error}`);
  }
}
