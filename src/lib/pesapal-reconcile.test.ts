import { describe, it, expect, vi } from "vitest";

// server-only stubbed via vitest.config.ts
// No fs/saleorAdmin mocking needed — reconcilePesapalOrders takes injected deps.

import { reconcilePesapalOrders } from "./pesapal-reconcile";
import type { ReconcileDeps } from "./pesapal-reconcile";

const completedStatus = () =>
  Promise.resolve({ payment_status_description: "Completed" } as Parameters<ReconcileDeps["getStatus"]>[0] extends infer _P ? Awaited<ReturnType<ReconcileDeps["getStatus"]>> : never);
const pendingStatus = () =>
  Promise.resolve({ payment_status_description: "Pending" } as Awaited<ReturnType<ReconcileDeps["getStatus"]>>);
const failedStatus = () =>
  Promise.resolve({ payment_status_description: "Failed" } as Awaited<ReturnType<ReconcileDeps["getStatus"]>>);
const reversedStatus = () =>
  Promise.resolve({ payment_status_description: "Reversed" } as Awaited<ReturnType<ReconcileDeps["getStatus"]>>);
const successComplete = () => Promise.resolve({ orderId: "order-1" });
const alreadyDoneComplete = () => Promise.resolve({ alreadyDone: true as const });
const errorComplete = () => Promise.resolve({ error: "Saleor error" });

describe("reconcilePesapalOrders", () => {
  it("returns zero counts when no pending checkouts", async () => {
    const result = await reconcilePesapalOrders({
      getPendingCheckouts: async () => [],
      getStatus: vi.fn(),
      complete: vi.fn(),
    });
    expect(result).toEqual({ completed: 0, skipped: 0, errors: 0 });
  });

  it("completes a Completed payment and counts it", async () => {
    const complete = vi.fn(successComplete);
    const result = await reconcilePesapalOrders({
      getPendingCheckouts: async () => [{ checkoutId: "c1", trackingId: "t1" }],
      getStatus: completedStatus,
      complete,
    });
    expect(result).toEqual({ completed: 1, skipped: 0, errors: 0 });
    expect(complete).toHaveBeenCalledWith("c1", "t1", undefined);
  });

  it("threads the PSP payment method through to completion", async () => {
    const complete = vi.fn(successComplete);
    const result = await reconcilePesapalOrders({
      getPendingCheckouts: async () => [{ checkoutId: "c1", trackingId: "t1" }],
      getStatus: () =>
        Promise.resolve({
          payment_status_description: "Completed",
          payment_method: "VISA",
        } as Awaited<ReturnType<ReconcileDeps["getStatus"]>>),
      complete,
    });
    expect(result).toEqual({ completed: 1, skipped: 0, errors: 0 });
    expect(complete).toHaveBeenCalledWith("c1", "t1", "VISA");
  });

  it("counts alreadyDone as completed — idempotent", async () => {
    const result = await reconcilePesapalOrders({
      getPendingCheckouts: async () => [{ checkoutId: "c1", trackingId: "t1" }],
      getStatus: completedStatus,
      complete: vi.fn(alreadyDoneComplete),
    });
    expect(result).toEqual({ completed: 1, skipped: 0, errors: 0 });
  });

  it("skips a Pending payment", async () => {
    const complete = vi.fn();
    const result = await reconcilePesapalOrders({
      getPendingCheckouts: async () => [{ checkoutId: "c1", trackingId: "t1" }],
      getStatus: pendingStatus,
      complete,
    });
    expect(result).toEqual({ completed: 0, skipped: 1, errors: 0 });
    expect(complete).not.toHaveBeenCalled();
  });

  it("skips a Failed payment without calling complete", async () => {
    const complete = vi.fn();
    const result = await reconcilePesapalOrders({
      getPendingCheckouts: async () => [{ checkoutId: "c1", trackingId: "t1" }],
      getStatus: failedStatus,
      complete,
    });
    expect(result).toEqual({ completed: 0, skipped: 1, errors: 0 });
    expect(complete).not.toHaveBeenCalled();
  });

  it("skips a Reversed payment without calling complete", async () => {
    const result = await reconcilePesapalOrders({
      getPendingCheckouts: async () => [{ checkoutId: "c1", trackingId: "t1" }],
      getStatus: reversedStatus,
      complete: vi.fn(),
    });
    expect(result).toEqual({ completed: 0, skipped: 1, errors: 0 });
  });

  it("counts as error when Completed but complete() returns error", async () => {
    const result = await reconcilePesapalOrders({
      getPendingCheckouts: async () => [{ checkoutId: "c1", trackingId: "t1" }],
      getStatus: completedStatus,
      complete: vi.fn(errorComplete),
    });
    expect(result).toEqual({ completed: 0, skipped: 0, errors: 1 });
  });

  it("counts as error when getStatus throws", async () => {
    const result = await reconcilePesapalOrders({
      getPendingCheckouts: async () => [{ checkoutId: "c1", trackingId: "t1" }],
      getStatus: async () => { throw new Error("network"); },
      complete: vi.fn(),
    });
    expect(result).toEqual({ completed: 0, skipped: 0, errors: 1 });
  });

  it("handles multiple checkouts independently", async () => {
    const statuses = [completedStatus, pendingStatus, failedStatus, completedStatus];
    let call = 0;
    const result = await reconcilePesapalOrders({
      getPendingCheckouts: async () => [
        { checkoutId: "c1", trackingId: "t1" },
        { checkoutId: "c2", trackingId: "t2" },
        { checkoutId: "c3", trackingId: "t3" },
        { checkoutId: "c4", trackingId: "t4" },
      ],
      getStatus: () => statuses[call++](),
      complete: vi.fn(successComplete),
    });
    expect(result).toEqual({ completed: 2, skipped: 2, errors: 0 });
  });

  it("processes all checkouts even if one errors", async () => {
    const statuses = [completedStatus, completedStatus, completedStatus];
    let call = 0;
    const completeResults = [
      successComplete,
      errorComplete,   // middle one errors
      successComplete,
    ];
    let completeCall = 0;
    const result = await reconcilePesapalOrders({
      getPendingCheckouts: async () => [
        { checkoutId: "c1", trackingId: "t1" },
        { checkoutId: "c2", trackingId: "t2" },
        { checkoutId: "c3", trackingId: "t3" },
      ],
      getStatus: () => statuses[call++](),
      complete: () => completeResults[completeCall++](),
    });
    expect(result).toEqual({ completed: 2, skipped: 0, errors: 1 });
  });
});
