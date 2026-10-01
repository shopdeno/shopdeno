import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// server-only stubbed via vitest.config.ts → src/__mocks__/server-only.ts

// Hoist mock fn creation so the factory closure captures the same instances the test asserts on.
const { mockRead, mockWrite } = vi.hoisted(() => ({
  mockRead: vi.fn(),
  mockWrite: vi.fn(),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  const mocked = { ...actual, readFileSync: mockRead, writeFileSync: mockWrite };
  return { ...mocked, default: mocked };
});

import { convertUsdToKes, getUsdToKesRate } from "./fx";

describe("convertUsdToKes", () => {
  it.each<[number, number, number]>([
    [50, 130, 6500],
    [50, 129.5, 6475],
    [50, 130.01, 6501],   // 6500.5 → 6501
    [50, 130.004, 6500],  // 6500.2 → 6500
    [0, 130, 0],
    [1.99, 130, 259],     // 258.7 → 259
  ])("(%d USD × %d) → %d KES", (usd, rate, expected) => {
    expect(convertUsdToKes(usd, rate)).toBe(expected);
  });
});

describe("getUsdToKesRate", () => {
  beforeEach(() => {
    mockRead.mockReset();
    mockWrite.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns USD_KES_RATE env when set", async () => {
    vi.stubEnv("USD_KES_RATE", "132.5");
    expect(await getUsdToKesRate()).toBe(132.5);
  });

  it("invalid env falls through to cache", async () => {
    vi.stubEnv("USD_KES_RATE", "not-a-number");
    mockRead.mockReturnValue(
      JSON.stringify({ rate: 128, fetchedAt: Date.now() - 1000 })
    );
    expect(await getUsdToKesRate()).toBe(128);
  });

  it("returns cached rate when cache is fresh (< 23h)", async () => {
    vi.stubEnv("USD_KES_RATE", "");
    mockRead.mockReturnValue(
      JSON.stringify({ rate: 128, fetchedAt: Date.now() - 1000 })
    );
    expect(await getUsdToKesRate()).toBe(128);
  });

  it("fetches live when cache is stale and writes new cache", async () => {
    vi.stubEnv("USD_KES_RATE", "");
    mockRead.mockReturnValue(
      JSON.stringify({ rate: 100, fetchedAt: Date.now() - 25 * 60 * 60 * 1000 })
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ rates: { KES: 131.5 } }) })
    );
    expect(await getUsdToKesRate()).toBe(131.5);
    expect(mockWrite).toHaveBeenCalled();
  });

  it("fetches live when no cache file exists", async () => {
    vi.stubEnv("USD_KES_RATE", "");
    mockRead.mockImplementation(() => {
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ rates: { KES: 131.5 } }) })
    );
    expect(await getUsdToKesRate()).toBe(131.5);
  });

  it("throws when no env, no cache, fetch fails", async () => {
    vi.stubEnv("USD_KES_RATE", "");
    mockRead.mockImplementation(() => {
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    await expect(getUsdToKesRate()).rejects.toThrow("USD→KES rate unavailable");
  });
});
