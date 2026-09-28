import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ProductCardProduct } from "@/components/ProductCard";
import { sizedImageUrl } from "@/lib/imageUtils";

// Shapes written by scripts/export-catalog-snapshot.mjs into public/catalog/.
export interface SnapshotMeta {
  generatedAt: string;
  count: number;
  channel: string;
}

export interface SnapshotLight {
  id: string;
  slug: string;
  name: string;
  price: { amount: number; currency: string } | null;
  originalPrice: { amount: number; currency: string } | null;
  thumbnail: { url: string; alt?: string } | null;
  /** First Supabase direct media URL (cold-start-immune fallback). */
  imageUrl: string | null;
  imageAlt: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  mediaCount: number;
}

export interface SnapshotDetail {
  id: string;
  name: string;
  slug: string;
  seoTitle: string | null;
  seoDescription: string | null;
  description: string | null;
  descriptionJson: string | null;
  rating: number | null;
  isAvailableForPurchase: boolean;
  availableForPurchase: string | null;
  pricing: ProductCardProduct["pricing"] | null;
  images: { id: string; url: string; alt?: string }[];
  thumbnail: { url: string; alt?: string } | null;
  // Full variant/attribute payloads are passed through to ProductDetailClient.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variants: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributes: any[];
  category: { id: string; name: string; slug: string } | null;
}

function catalogDir() {
  return join(process.cwd(), "public", "catalog");
}

function readJson<T>(file: string): T | null {
  try {
    const p = join(catalogDir(), file);
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Light catalog for the /products grid. Null when no snapshot exported yet. */
export function loadCatalogSnapshot(): SnapshotLight[] | null {
  const data = readJson<SnapshotLight[]>("catalog.json");
  return Array.isArray(data) && data.length > 0 ? data : null;
}

/** Full product snapshot for /products/[slug]. */
export function loadProductSnapshot(slug: string): SnapshotDetail | null {
  const safe = slug.replace(/[^a-z0-9-]/gi, "-");
  return readJson<SnapshotDetail>(`${safe}.json`);
}

/** All snapshot slugs (for generateStaticParams). */
export function snapshotSlugs(): string[] {
  return (loadCatalogSnapshot() ?? []).map((p) => p.slug);
}

export function snapshotMeta(): SnapshotMeta | null {
  return readJson<SnapshotMeta>("meta.json");
}

export function toCardProduct(p: SnapshotLight): ProductCardProduct {
  // Prefer the sized thumbnail (512px Supabase rendition, ~30KB) — unless it
  // is a Saleor `/thumbnail/` proxy URL, which routes through the sleeping
  // Render container. In that case use the first media original resized via
  // Supabase transforms (cold-start-immune, also ~30KB).
  const proxyThumb = p.thumbnail?.url.includes("/thumbnail/") ?? true;
  const thumb =
    p.thumbnail && !proxyThumb
      ? { url: sizedImageUrl(p.thumbnail.url, 512), alt: p.thumbnail.alt }
      : p.imageUrl
        ? { url: sizedImageUrl(p.imageUrl, 512), alt: p.imageAlt ?? p.name }
        : p.thumbnail
          ? { url: sizedImageUrl(p.thumbnail.url, 512), alt: p.thumbnail.alt }
          : null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    thumbnail: thumb,
    media: thumb ? [thumb] : [],
    variants: [],
    pricing: p.price
      ? {
          priceRange: { start: { gross: p.price } },
          priceRangeUndiscounted: p.originalPrice ? { start: { gross: p.originalPrice } } : null,
        }
      : null,
  };
}

/** Sort snapshot rows the same way the live query sorts (NAME/PRICE variants). */
export function sortSnapshot(rows: SnapshotLight[], sort: string): SnapshotLight[] {
  const out = [...rows];
  switch (sort) {
    case "NAME_DESC":
      return out.sort((a, b) => b.name.localeCompare(a.name));
    case "PRICE":
      return out.sort((a, b) => (a.price?.amount ?? Infinity) - (b.price?.amount ?? Infinity));
    case "PRICE_DESC":
      return out.sort((a, b) => (b.price?.amount ?? -Infinity) - (a.price?.amount ?? -Infinity));
    case "DATE":
    case "DATE_DESC":
      // Snapshot has no publication date — keep export (NAME) order.
      return out;
    case "NAME":
    default:
      return out.sort((a, b) => a.name.localeCompare(b.name));
  }
}
