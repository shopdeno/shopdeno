import "server-only";
import type { DocumentNode } from "graphql";
import { print } from "graphql";

// Server-side Saleor GraphQL client. Unlike src/lib/saleor.ts (anonymous /
// customer-token urql client used in the browser), this runs only in Route
// Handlers and authenticates with an app token that carries HANDLE_PAYMENTS +
// MANAGE_CHECKOUTS — required for transactionCreate / transactionEventReport.
//
// Auth resolution order:
//   1. SALEOR_APP_TOKEN  — a Saleor App token (create the app in the dashboard
//      with HANDLE_PAYMENTS + MANAGE_CHECKOUTS). Use this in production.
//   2. Fallback: log in with SALEOR_EMAIL / SALEOR_PASSWORD (defaults to the
//      local admin@example.com / admin) via tokenCreate — convenient for local
//      dev so pickup checkout works without provisioning an app first.

function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_SALEOR_API_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SALEOR_API_URL is not set");
  return url;
}

let cachedStaffToken: string | null = null;

async function loginStaff(): Promise<string> {
  if (cachedStaffToken) return cachedStaffToken;
  const email = process.env.SALEOR_EMAIL || "admin@example.com";
  const password = process.env.SALEOR_PASSWORD || "admin";
  const res = await fetch(getApiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `mutation($e:String!,$p:String!){tokenCreate(email:$e,password:$p){token errors{message}}}`,
      variables: { e: email, p: password },
    }),
  });
  const json = await res.json();
  const token = json?.data?.tokenCreate?.token;
  if (!token) {
    throw new Error(
      "Saleor staff login failed: " +
        JSON.stringify(json?.data?.tokenCreate?.errors ?? json?.errors ?? json)
    );
  }
  cachedStaffToken = token;
  return token;
}

async function getServerToken(): Promise<string> {
  const appToken = process.env.SALEOR_APP_TOKEN?.trim();
  if (appToken) return appToken;
  return loginStaff();
}

type GraphQLResult<T> = { data?: T; errors?: Array<{ message: string }> };

// Executes a mutation/query against Saleor with the server (app/staff) token.
// Throws on transport or top-level GraphQL errors; per-mutation `errors` arrays
// are left for the caller to inspect.
export async function saleorAdmin<T = unknown>(
  document: DocumentNode,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const token = await getServerToken();
  const res = await fetch(getApiUrl(), {
    method: "POST",
    // Bypass Next's fetch cache — every payment/transaction call must be live.
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: print(document), variables }),
  });

  if (!res.ok) {
    throw new Error(`Saleor request failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as GraphQLResult<T>;
  if (json.errors?.length) {
    throw new Error("Saleor GraphQL error: " + json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) throw new Error("Saleor returned no data");
  return json.data;
}
