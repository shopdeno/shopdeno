import "server-only";

// PesaPal API 3.0 client — server-only.
// Creds from WooCommerce woocommerce_pesapal_settings (consumerkey/secretkey).
// Sandbox: https://cybqa.pesapal.com/pesapalv3
// Production: https://pay.pesapal.com/v3

function getBase(): string {
  return (process.env.PESAPAL_API_BASE || "https://pay.pesapal.com/v3").replace(/\/$/, "");
}

export async function pesapalAuth(): Promise<string> {
  const res = await fetch(`${getBase()}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET,
    }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!data.token) {
    throw new Error(`PesaPal auth failed: ${JSON.stringify(data)}`);
  }
  return data.token as string;
}

export async function pesapalGet<T = unknown>(path: string): Promise<T> {
  const token = await pesapalAuth();
  const res = await fetch(`${getBase()}${path}`, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return res.json() as Promise<T>;
}

export async function pesapalPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const token = await pesapalAuth();
  const res = await fetch(`${getBase()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return res.json() as Promise<T>;
}

export type PesapalOrderStatus = {
  payment_method: string;
  amount: number;
  created_date: string;
  confirmation_code: string;
  merchant_reference: string;
  payment_status_description: string; // "Completed" | "Pending" | "Failed" | "Reversed"
  message: string;
  payment_account: string;
  call_back_url: string;
  status_code: number; // 1=Invalid, 2=Completed, 3=Failed, 4=Reversed
  currency: string;
  error?: { error_type: string; code: string; message: string };
};

export async function getPesapalStatus(orderTrackingId: string): Promise<PesapalOrderStatus> {
  return pesapalGet<PesapalOrderStatus>(
    `/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`
  );
}

export type PesapalRefundResult = {
  status: string; // "200" = request received (NOT yet effected — needs merchant/finance go-ahead)
  message: string;
};

/**
 * Files a refund request with PesaPal (full amount only for mobile money, one
 * refund per payment, COMPLETED payments only — enforced by the caller).
 * A "200" response means PesaPal RECEIVED the request; the money moves only
 * after merchant/finance approval. Never throws — callers decide.
 */
export async function requestPesapalRefund(args: {
  confirmationCode: string;
  amount: number;
  username: string;
  remarks: string;
}): Promise<PesapalRefundResult> {
  return pesapalPost<PesapalRefundResult>("/api/Transactions/RefundRequest", {
    confirmation_code: args.confirmationCode,
    amount: args.amount,
    username: args.username,
    remarks: args.remarks,
  });
}
