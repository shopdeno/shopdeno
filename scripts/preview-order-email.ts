/**
 * Dev-only: render the order-confirmation email to HTML files for visual review,
 * without deploying or creating a real order.
 *   npx tsx scripts/preview-order-email.ts
 * Writes /tmp/email-pickup.html and /tmp/email-ship.html.
 */
import { writeFileSync } from "node:fs";
import { renderOrderEmailHtml, type OrderEmailParams } from "@/lib/order-email";

const base: Omit<OrderEmailParams, "delivery" | "deliveryName"> = {
  to: "customer@example.com",
  customerName: "Amara",
  orderNumber: "1042",
  lines: [
    { name: "Attitude", quantity: 1, amount: 50, currency: "USD" },
    { name: "Krooks", quantity: 2, amount: 50, currency: "USD" },
  ],
  total: { amount: 150, currency: "USD" },
};

const pickup: OrderEmailParams = { ...base, delivery: "pickup", deliveryName: "Default Warehouse" };
const ship: OrderEmailParams = {
  ...base,
  delivery: "ship",
  deliveryName: "DHL Express",
};

writeFileSync("/tmp/email-pickup.html", renderOrderEmailHtml(pickup));
writeFileSync("/tmp/email-ship.html", renderOrderEmailHtml(ship));
console.log("Wrote /tmp/email-pickup.html and /tmp/email-ship.html");
