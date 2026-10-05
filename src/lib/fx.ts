import "server-only";
import fs from "fs";
import path from "path";

// Cache lives in /tmp — writable on Vercel, persists within warm function instances.
const CACHE_PATH = path.join("/tmp", "usd_kes_rate.json");
const CACHE_MAX_AGE_MS = 23 * 60 * 60 * 1000; // 23 hours

export function convertUsdToKes(usdAmount: number, rate: number): number {
  return Math.round(usdAmount * rate);
}

type FxCache = { rate: number; fetchedAt: number };

function readCache(): FxCache | null {
  try {
    const raw = fs.readFileSync(CACHE_PATH, "utf-8");
    const data = JSON.parse(raw) as FxCache;
    if (typeof data.rate !== "number" || typeof data.fetchedAt !== "number") return null;
    if (Date.now() - data.fetchedAt > CACHE_MAX_AGE_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(rate: number): void {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify({ rate, fetchedAt: Date.now() }));
  } catch {
    // Non-fatal: write failure doesn't block payment; next call will fetch live again.
  }
}

type FeedDef = {
  name: string;
  url: string;
  /** Extract the KES-per-USD rate from the feed's JSON body. */
  parse: (data: unknown) => number | undefined;
};

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;
}

// Ordered by reliability (verified 2026-10-05). frankfurter moved
// api.frankfurter.app → api.frankfurter.dev and the legacy path now 404s,
// so it stays only as a last-resort fallback.
const FEEDS: FeedDef[] = [
  {
    name: "er-api",
    url: "https://open.er-api.com/v6/latest/USD",
    parse: (d) => num((d as { rates?: { KES?: unknown } })?.rates?.KES),
  },
  {
    name: "frankfurter",
    url: "https://api.frankfurter.app/latest?from=USD&to=KES",
    parse: (d) => num((d as { rates?: { KES?: unknown } })?.rates?.KES),
  },
];

async function fetchFromFeed(feed: FeedDef): Promise<number> {
  const res = await fetch(feed.url, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`${feed.name} returned HTTP ${res.status}`);
  const rate = feed.parse(await res.json());
  if (rate === undefined) throw new Error(`${feed.name}: no KES rate in response`);
  return rate;
}

async function fetchLiveRate(): Promise<number> {
  const failures: string[] = [];
  for (const feed of FEEDS) {
    try {
      return await fetchFromFeed(feed);
    } catch (err) {
      failures.push(err instanceof Error ? err.message : String(err));
    }
  }
  throw new Error(`all FX feeds failed (${failures.join("; ")})`);
}

// Priority: USD_KES_RATE env → warm cache (< 23h) → live fetch → throw.
export async function getUsdToKesRate(): Promise<number> {
  const envRate = parseFloat(process.env.USD_KES_RATE ?? "");
  if (envRate > 0) return envRate;

  const cached = readCache();
  if (cached) return cached.rate;

  try {
    const rate = await fetchLiveRate();
    writeCache(rate);
    return rate;
  } catch (err) {
    throw new Error(
      `USD→KES rate unavailable: cache cold, feed unreachable. Set USD_KES_RATE env as fallback. (${String(err)})`
    );
  }
}

// Called by daily cron to pre-warm cache so payment path never blocks on a live fetch.
export async function refreshUsdToKesRate(): Promise<number> {
  const rate = await fetchLiveRate();
  writeCache(rate);
  return rate;
}
