// Live Saleor gets a short window: a sleeping Render container (~60s wake)
// must not block page renders that have a snapshot/skeleton fallback.
// Note: urql resolves (never rejects) on network/GraphQL errors, so callers
// must still check `result.error` after the timeout race wins cleanly.
export const LIVE_TIMEOUT_MS = 8000;

export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}
