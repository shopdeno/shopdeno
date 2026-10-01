import "server-only";
import { gql } from "graphql-tag";
import { saleorAdmin } from "@/lib/saleor-server";
import { TRANSACTION_CREATE } from "@/graphql/transactions";
import { CHECKOUT_COMPLETE_MUTATION } from "@/graphql/checkout";

const CHECKOUT_TRANSACTIONS_QUERY = gql`
  query CheckoutTransactionsForPaypal($id: ID!) {
    checkout(id: $id) {
      id
      transactions {
        id
        pspReference
      }
    }
  }
`;

type CheckoutTransactionsResult = {
  checkout: {
    id: string;
    transactions: Array<{ id: string; pspReference: string }>;
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

// Idempotent: dedupes by PayPal capture ID (pspReference).
// Safe to call from the capture route and from the webhook.
export async function completePaypalPayment(
  checkoutId: string,
  pspReference: string,
  amount: number,
  currency: string
): Promise<{ orderId?: string; orderNumber?: string; alreadyDone?: boolean; error?: string }> {
  const { checkout } = await saleorAdmin<CheckoutTransactionsResult>(
    CHECKOUT_TRANSACTIONS_QUERY,
    { id: checkoutId }
  );

  // Checkout already converted to an order.
  if (!checkout) return { alreadyDone: true };

  const alreadyRecorded = checkout.transactions.some((t) => t.pspReference === pspReference);
  if (!alreadyRecorded) {
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
      return { error: txn.transactionCreate.errors[0].message };
    }
  }

  const completion = await saleorAdmin<CheckoutCompleteResult>(CHECKOUT_COMPLETE_MUTATION, {
    checkoutId,
  });

  const { order, errors } = completion.checkoutComplete;
  if (errors.length) {
    if (errors[0].code === "CHECKOUT_NOT_FOUND") return { alreadyDone: true };
    return { error: errors[0].message };
  }
  if (!order) return { error: "Order not created" };
  return { orderId: order.id, orderNumber: order.number };
}
