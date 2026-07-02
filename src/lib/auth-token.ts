// Single source of truth for the Saleor auth token.
//
// The urql client in ./saleor.ts reads this cookie in fetchOptions to attach
// `Authorization: Bearer <token>` to every request, so the token MUST live in
// this cookie (not localStorage) for authenticated queries to work across the
// shared client. (For httpOnly/refresh-token hardening, migrate to
// @saleor/auth-sdk — already a dependency — in a later pass.)

export const AUTH_TOKEN_COOKIE = "saleor_auth_token";

// 30 days, matches Saleor's default access-token lifetime closely enough for a
// storefront session; queries re-auth on 401 anyway.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function getAuthToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${AUTH_TOKEN_COOKIE}=`))
    ?.split("=")[1];
}

export function setAuthToken(token: string): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AUTH_TOKEN_COOKIE}=${token}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

export function clearAuthToken(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
