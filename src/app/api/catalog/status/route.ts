import { NextResponse } from "next/server";
import { loadCatalogSnapshot, snapshotMeta } from "@/lib/catalog-snapshot";

// Freshness probe for the static catalog snapshot (public/catalog/).
// Used to verify nightly refreshes: GET /api/catalog/status
export async function GET() {
  const meta = snapshotMeta();
  const catalog = loadCatalogSnapshot();
  return NextResponse.json(
    {
      snapshotPresent: catalog !== null,
      count: catalog?.length ?? 0,
      generatedAt: meta?.generatedAt ?? null,
      channel: meta?.channel ?? null,
      stale:
        meta?.generatedAt != null
          ? Date.now() - new Date(meta.generatedAt).getTime() > 25 * 3600 * 1000
          : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
