import { NextResponse } from "next/server";
import { gql } from "graphql-tag";
import { saleorAdmin } from "@/lib/saleor-server";
import { getPesapalStatus } from "@/lib/pesapal";
import { TRANSACTION_CREATE } from "@/graphql/transactions";
import { CHECKOUT_COMPLETE_MUTATION } from "@/graphql/checkout";

// PesaPal IPN listener — called server-to-server by PesaPal after a payment.
// Must return "OK" (plain text) for PesaPal to mark the notification as acknowledged.
// Register this URL once via GET /api/payments/pesapal/register-ipn.
//
// PesaPal v3 sends GET with: OrderTrackingId, OrderMerchantReference, OrderNotificationType.
// OrderMerchantReference = the checkoutId we passed as `id` in SubmitOrderRequest.

const CHECKOUT_TRANSACTIONS_QUERY = gql`
  query CheckoutTransactions($id: ID!) {
    checkout(id: $id) {
      id
      totalPrice {
        gross {
          amount
          currency
        }
      }
      transactions {
        id
        pspReference
        chargedAmount {
          amount
          currency
        }
      }
    }
  }
`;

type CheckoutTransactionsResult = {
  checkout: {
    id: string;
    totalPrice: { gross: { amount: number; currency: string } };
    transactions: Array<{
      id: string;
      pspReference: string;
      chargedAmount: { amount: number; currency: string };
    }>;
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
    order: { id: string; number: string } | null;
    confirmationNeeded: boolean;
    errors: Array<{ field: string | null; message: string; code: string }>;
  };
};

export async function completePesapalPayment(
  checkoutId: string,
  orderTrackingId: string
): Promise<{ orderId?: string; orderNumber?: string; alreadyDone?: boolean; error?: string }> {
  const { checkout } = await saleorAdmin<CheckoutTransactionsResult>(
    CHECKOUT_TRANSACTIONS_QUERY,
    { id: checkoutId }
  );

  // Checkout converted to order already
  if (!checkout) return { alreadyDone: true };

  const { amount, currency } = checkout.totalPrice.gross;

  // Skip if we already recorded a charged transaction for this PesaPal reference
  const existing = checkout.transactions.find((t) => t.pspReference === orderTrackingId);
  if (!existing) {
    const txn = await saleorAdmin<TransactionCreateResult>(TRANSACTION_CREATE, {
      id: checkoutId,
      transaction: {
        name: "PesaPal — M-Pesa / card payment",
        pspReference: orderTrackingId,
        availableActions: ["REFUND"],
        amountCharged: { amount, currency },
      },
      transactionEvent: {
        message: `PesaPal payment confirmed (${orderTrackingId})`,
        pspReference: orderTrackingId,
      },
    });

    if (txn.transactionCreate.errors.length) {
      return { error: txn.transactionCreate.errors[0].message };
    }
  }

  const completion = await saleorAdmin<CheckoutCompleteResult>(CHECKOUT_COMPLETE_MUTATION, {
    checkoutId,
  });

  const { order, errors } = completion.checkoutComplete;
  if (errors.length) {
    // If checkout already completed, treat as success
    if (errors[0].code === "CHECKOUT_NOT_FOUND") return { alreadyDone: true };
    return { error: errors[0].message };
  }
  if (!order) return { error: "Order not created" };

  return { orderId: order.id, orderNumber: order.number };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderTrackingId = searchParams.get("OrderTrackingId");
  const checkoutId = searchParams.get("OrderMerchantReference");

  if (!orderTrackingId || !checkoutId) {
    // Must return OK so PesaPal doesn't retry indefinitely
    return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  try {
    const status = await getPesapalStatus(orderTrackingId);

    if (status.payment_status_description === "Completed") {
      await completePesapalPayment(checkoutId, orderTrackingId);
    } else {
      console.log(`PesaPal IPN: status ${status.payment_status_description} for ${orderTrackingId}`);
    }
  } catch (err) {
    console.error("PesaPal IPN error:", err);
  }

  return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
}
