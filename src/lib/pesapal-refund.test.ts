import { describe, it, expect, vi, afterEach } from "vitest";

// server-only stubbed via vitest.config.ts → src/__mocks__/server-only.ts

import { requestPesapalRefund } from "./pesapal";

describe("requestPesapalRefund", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("authenticates then posts the refund to the RefundRequest endpoint", async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string, init: { body?: string }) => {
        calls.push({ url, body: init.body ? JSON.parse(init.body) : null });
        if (String(url).endsWith("/api/Auth/RequestToken")) {
          return Promise.resolve({ json: () => Promise.resolve({ token: "tok" }) });
        }
        return Promise.resolve({
          json: () => Promise.resolve({ status: "200", message: "Refund request successfully" }),
        });
      })
    );

    const result = await requestPesapalRefund({
      confirmationCode: "QHX123",
      amount: 130,
      username: "store-ops",
      remarks: "go-live test",
    });

    expect(result.status).toBe("200");
    expect(calls).toHaveLength(2);
    expect(calls[1].url).toContain("/api/Transactions/RefundRequest");
    expect(calls[1].body).toEqual({
      confirmation_code: "QHX123",
      amount: 130,
      username: "store-ops",
      remarks: "go-live test",
    });
  });
});
