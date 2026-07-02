import { NextResponse } from "next/server";
import { gql } from "graphql-tag";
import { saleorAdmin } from "@/lib/saleor-server";
import { TRANSACTION_CREATE } from "@/graphql/transactions";
import { CHECKOUT_COMPLETE_MUTATION } from "@/graphql/checkout";

// Studio pickup / offline completion. Records an AUTHORIZED transaction covering
// the full total (money collected on collection at the studio), which flips the
// checkout's authorizeStatus to FULL, then completes it into an order.

const CHECKOUT_TOTAL_QUERY = gql`
  query CheckoutTotal($checkoutId: ID!) {
    checkout(id: $checkoutId) {
      id
      totalPrice {
        gross {
          amount
          currency
        }
      }
    }
  }
`;

type CheckoutTotalResult = {
  checkout: {
    id: string;
    totalPrice: { gross: { amount: number; currency: string } };
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
    // 1. Read the authoritative total server-side (never trust client amounts).
    const { checkout } = await saleorAdmin<CheckoutTotalResult>(CHECKOUT_TOTAL_QUERY, {
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

    return NextResponse.json({ orderId: order.id, orderNumber: order.number });
  } catch (err) {
    console.error("Pickup completion failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Completion failed" },
      { status: 500 }
    );
  }
}
