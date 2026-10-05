import { describe, it, expect } from "vitest";
import { renderOrderEmailHtml, type OrderEmailParams } from "./order-email";

const base: OrderEmailParams = {
  to: "buyer@example.com",
  customerName: "Ciaran",
  orderNumber: "8",
  lines: [{ name: "[TEST] PesaPal Live Test", quantity: 1, amount: 1, currency: "USD" }],
  total: { amount: 1, currency: "USD" },
  delivery: "pickup",
};

describe("renderOrderEmailHtml payment block", () => {
  it("unpaid pickup shows pay-on-collection, never a paid block", () => {
    const html = renderOrderEmailHtml({ ...base });
    expect(html).toContain("Payment due on collection");
    expect(html).toContain("No payment has been taken yet");
    expect(html).not.toContain("Paid in full");
  });

  it("prepaid pickup shows paid block, never pay-on-collection", () => {
    const html = renderOrderEmailHtml({
      ...base,
      paid: { amount: 1, currency: "USD", method: "M-Pesa" },
    });
    expect(html).toContain("Paid in full");
    expect(html).toContain("M-Pesa");
    expect(html).not.toContain("Payment due on collection");
    expect(html).not.toContain("No payment has been taken yet");
  });
});
