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

async function fetchLiveRate(): Promise<number> {
  const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=KES", {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`FX feed returned HTTP ${res.status}`);
  const data = (await res.json()) as { rates?: { KES?: number } };
  if (typeof data.rates?.KES !== "number") throw new Error("FX feed: no KES rate in response");
  return data.rates.KES;
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
