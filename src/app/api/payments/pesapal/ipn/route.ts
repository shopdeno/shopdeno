import { gql } from "graphql-tag";
import { saleorAdmin } from "@/lib/saleor-server";
import { getPesapalStatus } from "@/lib/pesapal";
import { TRANSACTION_CREATE, TRANSACTION_EVENT_REPORT } from "@/graphql/transactions";
import { CHECKOUT_COMPLETE_MUTATION } from "@/graphql/checkout";
import { sendCheckoutConfirmation, type CheckoutConfirmationData } from "@/lib/order-email";

// PesaPal IPN listener — called server-to-server by PesaPal after a payment.
// Must return "OK" (plain text) for PesaPal to mark the notification as acknowledged.
// Register this URL once via GET /api/payments/pesapal/register-ipn.
//
// PesaPal v3 sends GET with: OrderTrackingId, OrderMerchantReference, OrderNotificationType.
// OrderMerchantReference = the checkoutId we passed as `id` in SubmitOrderRequest.

// Pulls transactions (to upgrade the pending txn) AND everything needed to build the
// confirmation email, in one round-trip, while the checkout still exists (checkoutComplete
// consumes it). Email fields mirror CHECKOUT_SUMMARY_QUERY in /api/checkout/complete.
const CHECKOUT_TRANSACTIONS_QUERY = gql`
  query CheckoutTransactions($id: ID!) {
    checkout(id: $id) {
      id
      email
      isShippingRequired
      billingAddress { firstName }
      shippingAddress { firstName }
      totalPrice {
        gross {
          amount
          currency
        }
      }
      transactions {
        id
        pspReference
        authorizedAmount { amount }
        chargedAmount { amount currency }
      }
      lines {
        quantity
        unitPrice { gross { amount currency } }
        variant {
          name
          media { url }
          product { name thumbnail { url } }
        }
      }
      deliveryMethod {
        __typename
        ... on ShippingMethod { name }
        ... on Warehouse { name }
      }
    }
  }
`;

type CheckoutTransactionsResult = {
  checkout: ({
    id: string;
    totalPrice: { gross: { amount: number; currency: string } };
    transactions: Array<{
      id: string;
      pspReference: string;
      authorizedAmount: { amount: number };
      chargedAmount: { amount: number; currency: string };
    }>;
  } & CheckoutConfirmationData) | null;
};

type TransactionCreateResult = {
  transactionCreate: {
    transaction: { id: string } | null;
    errors: Array<{ field: string | null; message: string; code: string }>;
  };
};

type TransactionEventReportResult = {
  transactionEventReport: {
    alreadyProcessed: boolean;
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
  orderTrackingId: string,
  paymentMethod?: string
): Promise<{ orderId?: string; orderNumber?: string; alreadyDone?: boolean; error?: string }> {
  const { checkout } = await saleorAdmin<CheckoutTransactionsResult>(
    CHECKOUT_TRANSACTIONS_QUERY,
    { id: checkoutId }
  );

  // Checkout converted to order already
  if (!checkout) return { alreadyDone: true };

  const { amount, currency } = checkout.totalPrice.gross;

  const existingTxn = checkout.transactions.find((t) => t.pspReference === orderTrackingId);

  if (existingTxn) {
    if (existingTxn.chargedAmount.amount > 0) {
      // Already fully charged — fall through to checkoutComplete.
    } else {
      // PENDING transaction exists (created at initiate time) — upgrade it to CHARGED in place.
      // transactionEventReport is idempotent (alreadyProcessed flag) so safe to replay.
      const report = await saleorAdmin<TransactionEventReportResult>(TRANSACTION_EVENT_REPORT, {
        id: existingTxn.id,
        type: "CHARGE_SUCCESS",
        amount,
        pspReference: orderTrackingId,
        message: `PesaPal payment confirmed (${orderTrackingId})`,
      });
      if (report.transactionEventReport.errors.length) {
        return { error: report.transactionEventReport.errors[0].message };
      }
    }
  } else {
    // No existing transaction — create new CHARGED transaction (path before ticket 02 PENDING).
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

  // Send the Resend confirmation synchronously. Only reached when checkoutComplete
  // yields a fresh order, so IPN / return-status / reconcile races send exactly one
  // email. `checkout` was captured above, before completion consumed it. Never throws.
  // Paid context: this money was taken online — the email must show the green
  // paid block, never pay-on-collection (live-test finding 2026-10-05). Method
  // comes from PesaPal's status (MPESA/VISA/…); normalized for display.
  const method = /^m-?pesa$/i.test(paymentMethod ?? "") ? "M-Pesa" : (paymentMethod || "M-Pesa");
  await sendCheckoutConfirmation(checkout, order.number, {
    paid: {
      amount: checkout.totalPrice.gross.amount,
      currency: checkout.totalPrice.gross.currency,
      method,
    },
  });

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
      await completePesapalPayment(checkoutId, orderTrackingId, status.payment_method);
    } else {
      console.log(`PesaPal IPN: status ${status.payment_status_description} for ${orderTrackingId}`);
    }
  } catch (err) {
    console.error("PesaPal IPN error:", err);
  }

  return new Response("OK", { status: 200, headers: { "Content-Type": "text/plain" } });
}
