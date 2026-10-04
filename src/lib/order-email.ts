import { siteConfig } from "@/lib/site-config";

// Order-confirmation email sent synchronously from the checkout-completion route
// via the Resend HTTP API. This deliberately does NOT depend on the Saleor Celery
// worker (which is unreliable on Render free tier) — the email is fired in the same
// request that creates the order. Failures here must never fail the order: the
// caller swallows errors and the customer still gets their confirmed order.

export type OrderEmailLine = {
  name: string;
  quantity: number;
  amount: number;
  currency: string;
};

export type OrderEmailParams = {
  to: string;
  /** Customer first name for the greeting; falls back to a generic line if absent. */
  customerName?: string | null;
  orderNumber: string;
  /** ISO string or Date; defaults to now (order is created at send time). */
  orderDate?: string | Date;
  lines: OrderEmailLine[];
  total: { amount: number; currency: string };
  /** "pickup" = collect at studio, "ship" = delivered to address. */
  delivery: "pickup" | "ship";
  deliveryName?: string | null;
};

// Resend sends only from a verified domain. The verified domain is the root
// `dennis-muraguri.co.ke` (NOT the `shop.` subdomain), so the From must use it.
// Override via ORDER_EMAIL_FROM if a different verified sender is set up later.
const FROM_ADDRESS = process.env.ORDER_EMAIL_FROM || "sales@dennis-muraguri.co.ke";

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

const formatDate = (d?: string | Date) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(
    d ? new Date(d) : new Date()
  );

export function renderOrderEmailHtml(p: OrderEmailParams): string {
  const rows = p.lines
    .map(
      (l) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee">${l.quantity}× ${escapeHtml(l.name)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${money(l.amount * l.quantity, l.currency)}</td>
        </tr>`
    )
    .join("");

  const deliveryBlock =
    p.delivery === "pickup"
      ? `<p style="margin:16px 0 4px"><strong>Ready for studio collection</strong></p>
         <p style="margin:0;color:#555">${escapeHtml(siteConfig.studio.name)}<br>${escapeHtml(siteConfig.studio.address)}</p>
         <p style="margin:8px 0;color:#555">${escapeHtml(siteConfig.studio.pickupNote)}</p>
         <p style="margin:8px 0 0;color:#555">
           <strong>Before you visit:</strong> call <a href="tel:${siteConfig.contact.phone}" style="color:#111">${escapeHtml(siteConfig.contact.phoneDisplay)}</a> to arrange a convenient collection time.<br>
           <strong>Please bring:</strong> your order number (#${escapeHtml(p.orderNumber)}) and a photo ID.
         </p>
         <p style="margin:12px 0 0;padding:10px 12px;background:#fff8e1;border-radius:6px;color:#111">
           <strong>Payment due on collection: ${money(p.total.amount, p.total.currency)}</strong><br>
           <span style="color:#555;font-size:13px">No payment has been taken yet — pay in person when you collect your print.</span>
         </p>`
      : `<p style="margin:16px 0 4px"><strong>What happens next</strong></p>
         <p style="margin:0;color:#555">
           We'll pack and dispatch your order${p.deliveryName ? ` via <strong>${escapeHtml(p.deliveryName)}</strong>` : ""}, usually within 1–2 business days.
           You'll receive tracking details by email as soon as it ships.<br>
           <strong>Estimated delivery:</strong> 5–10 business days.
         </p>`;

  return `<!doctype html><html><body style="margin:0;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#222">
    <div style="max-width:560px;margin:0 auto;padding:24px">
      <img src="${siteConfig.url}/muraguri-logo-email.png" alt="${escapeHtml(siteConfig.name)}" width="200" style="display:block;width:200px;max-width:70%;height:auto;margin:0 0 6px">
      <p style="margin:0 0 20px;color:#888">${escapeHtml(siteConfig.tagline)}</p>
      <div style="background:#fff;border-radius:8px;padding:24px">
        <h2 style="font-size:18px;margin:0 0 8px">Order confirmed 🎉</h2>
        <p style="margin:0 0 4px;color:#555">${p.customerName ? `Hi ${escapeHtml(p.customerName)}, thank` : "Thank"} you for your order. Your order number is <strong>#${escapeHtml(p.orderNumber)}</strong>.</p>
        <p style="margin:0 0 16px;color:#888;font-size:13px">Placed on ${formatDate(p.orderDate)}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
          <tr><td style="padding:12px 0 0;font-weight:bold">Total</td>
          <td style="padding:12px 0 0;text-align:right;font-weight:bold">${money(p.total.amount, p.total.currency)}</td></tr>
        </table>
        ${deliveryBlock}
      </div>
      <p style="margin:20px 0 0;color:#999;font-size:12px">Questions? Reply to this email or contact ${escapeHtml(siteConfig.contact.email)}.</p>
    </div>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

/**
 * Sends the order confirmation via Resend's HTTP API. Returns `{ ok: true }` on
 * success, `{ ok: false, error }` otherwise. Never throws.
 */
export async function sendOrderConfirmationEmail(
  p: OrderEmailParams
): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY not set" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${siteConfig.name} <${FROM_ADDRESS}>`,
        to: [p.to],
        reply_to: siteConfig.contact.email,
        subject: `Order #${p.orderNumber} confirmed — ${siteConfig.name}`,
        html: renderOrderEmailHtml(p),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send failed" };
  }
}
