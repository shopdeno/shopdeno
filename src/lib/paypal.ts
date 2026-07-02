import "server-only";

// PayPal REST API v2 client — server-only.
// Sandbox: https://api-m.sandbox.paypal.com
// Production: https://api-m.paypal.com

function getBase(): string {
  return (process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com").replace(/\/$/, "");
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getPayPalToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new Error("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required");
  }

  const res = await fetch(`${getBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`);
  }

  cachedToken = {
    value: data.access_token as string,
    expiresAt: Date.now() + (data.expires_in as number) * 1000,
  };
  return cachedToken.value;
}

export async function paypalPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const token = await getPayPalToken();
  const res = await fetch(`${getBase()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "PayPal-Request-Id": `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return res.json() as Promise<T>;
}

export async function paypalGet<T = unknown>(path: string): Promise<T> {
  const token = await getPayPalToken();
  const res = await fetch(`${getBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return res.json() as Promise<T>;
}
