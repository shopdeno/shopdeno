import "server-only";
import { gql } from "graphql-tag";
import { saleorAdmin } from "@/lib/saleor-server";
import { getPesapalStatus, type PesapalOrderStatus } from "@/lib/pesapal";
import { completePesapalPayment } from "@/app/api/payments/pesapal/ipn/route";

// Pending PesaPal checkouts: those with an authorized (not yet charged) PesaPal transaction.
// The PENDING transaction is created by pesapal/initiate at the time of SubmitOrderRequest.
const PENDING_PESAPAL_CHECKOUTS_QUERY = gql`
  query PendingPesapalCheckouts($after: String) {
    checkouts(first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          transactions {
            id
            name
            pspReference
            authorizedAmount { amount }
            chargedAmount { amount }
          }
        }
      }
    }
  }
`;

type CheckoutsPage = {
  checkouts: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    edges: Array<{
      node: {
        id: string;
        transactions: Array<{
          id: string;
          name: string;
          pspReference: string;
          authorizedAmount: { amount: number };
          chargedAmount: { amount: number };
        }>;
      };
    }>;
  };
};

export type PendingCheckout = { checkoutId: string; trackingId: string };

export type ReconcileDeps = {
  getPendingCheckouts: () => Promise<PendingCheckout[]>;
  getStatus: (trackingId: string) => Promise<PesapalOrderStatus>;
  complete: (checkoutId: string, trackingId: string) => Promise<{
    orderId?: string;
    orderNumber?: string;
    alreadyDone?: boolean;
    error?: string;
  }>;
};

export type ReconcileResult = { completed: number; skipped: number; errors: number };

// Core reconciliation logic — dependency-injected for testability.
export async function reconcilePesapalOrders(deps: ReconcileDeps): Promise<ReconcileResult> {
  const pending = await deps.getPendingCheckouts();
  const result: ReconcileResult = { completed: 0, skipped: 0, errors: 0 };

  for (const { checkoutId, trackingId } of pending) {
    try {
      const status = await deps.getStatus(trackingId);

      if (status.payment_status_description !== "Completed") {
        result.skipped++;
        continue;
      }

      const completion = await deps.complete(checkoutId, trackingId);
      if (completion.error) {
        console.error(`Reconcile: checkout ${checkoutId} completion failed — ${completion.error}`);
        result.errors++;
      } else {
        result.completed++;
      }
    } catch (err) {
      console.error(`Reconcile: checkout ${checkoutId} errored — ${String(err)}`);
      result.errors++;
    }
  }

  return result;
}

// Queries Saleor for all checkouts that have a pending (authorized, not charged) PesaPal transaction.
export async function fetchPendingPesapalCheckouts(): Promise<PendingCheckout[]> {
  const pending: PendingCheckout[] = [];
  let after: string | null = null;

  do {
    const page: CheckoutsPage = await saleorAdmin<CheckoutsPage>(PENDING_PESAPAL_CHECKOUTS_QUERY, {
      after,
    });

    for (const { node } of page.checkouts.edges) {
      for (const txn of node.transactions) {
        if (
          txn.name.startsWith("PesaPal") &&
          txn.authorizedAmount.amount > 0 &&
          txn.chargedAmount.amount === 0 &&
          txn.pspReference
        ) {
          pending.push({ checkoutId: node.id, trackingId: txn.pspReference });
          break; // one pending txn per checkout is enough
        }
      }
    }

    after = page.checkouts.pageInfo.hasNextPage ? page.checkouts.pageInfo.endCursor : null;
  } while (after);

  return pending;
}

// Production entry point — wires real deps and runs the sweep.
export async function runPesapalReconciliation(): Promise<ReconcileResult> {
  return reconcilePesapalOrders({
    getPendingCheckouts: fetchPendingPesapalCheckouts,
    getStatus: getPesapalStatus,
    complete: completePesapalPayment,
  });
}
