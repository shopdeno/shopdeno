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
  orderNumber: string;
  lines: OrderEmailLine[];
  total: { amount: number; currency: string };
  /** "pickup" = collect at studio, "ship" = delivered to address. */
  delivery: "pickup" | "ship";
  deliveryName?: string | null;
};

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

function buildHtml(p: OrderEmailParams): string {
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
         <p style="margin:8px 0;color:#555">${escapeHtml(siteConfig.studio.pickupNote)}</p>`
      : `<p style="margin:16px 0 4px"><strong>Shipping</strong></p>
         <p style="margin:0;color:#555">${escapeHtml(p.deliveryName || "Delivery to your address")} — you'll receive tracking details when your order ships.</p>`;

  return `<!doctype html><html><body style="margin:0;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#222">
    <div style="max-width:560px;margin:0 auto;padding:24px">
      <h1 style="font-size:20px;margin:0 0 4px">${escapeHtml(siteConfig.name)}</h1>
      <p style="margin:0 0 20px;color:#888">${escapeHtml(siteConfig.tagline)}</p>
      <div style="background:#fff;border-radius:8px;padding:24px">
        <h2 style="font-size:18px;margin:0 0 8px">Order confirmed 🎉</h2>
        <p style="margin:0 0 16px;color:#555">Thank you for your order. Your order number is <strong>#${escapeHtml(p.orderNumber)}</strong>.</p>
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
        from: `${siteConfig.name} <${siteConfig.contact.email}>`,
        to: [p.to],
        subject: `Order #${p.orderNumber} confirmed — ${siteConfig.name}`,
        html: buildHtml(p),
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
