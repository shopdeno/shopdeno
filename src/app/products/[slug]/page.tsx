import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSaleorClient, getChannel } from "@/lib/saleor";
import { PRODUCT_DETAIL_QUERY, RELATED_PRODUCTS_QUERY } from "@/graphql/queries";
import { ProductDetailClient } from "./ProductDetailClient";
import type { ProductCardProduct } from "@/components/ProductCard";
import { siteConfig } from "@/lib/site-config";
import {
  loadCatalogSnapshot,
  loadProductSnapshot,
  snapshotSlugs,
  toCardProduct,
  type SnapshotDetail,
} from "@/lib/catalog-snapshot";
import { LIVE_TIMEOUT_MS, withTimeout } from "@/lib/live-timeout";

// Hourly ISR + pre-rendered at build from the snapshot, so PDPs serve from
// the Vercel edge even while Render Saleor is waking up.
export const revalidate = 3600;

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return snapshotSlugs().map((slug) => ({ slug }));
}

// SnapshotDetail mirrors the live Product shape closely enough to pass
// straight through to the client component.
function snapshotToProduct(snap: SnapshotDetail) {
  return {
    id: snap.id,
    name: snap.name,
    slug: snap.slug,
    description: snap.description ?? undefined,
    descriptionJson: snap.descriptionJson ?? undefined,
    seoDescription: snap.seoDescription ?? undefined,
    seoTitle: snap.seoTitle ?? undefined,
    rating: snap.rating ?? undefined,
    isAvailableForPurchase: snap.isAvailableForPurchase,
    pricing: snap.pricing ?? { priceRange: {} },
    images: snap.images,
    thumbnail: snap.thumbnail ?? undefined,
    variants: snap.variants,
    attributes: snap.attributes,
    category: snap.category ?? undefined,
  };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const client = getSaleorClient();

  try {
    const result = await withTimeout(
      client.query(PRODUCT_DETAIL_QUERY, { slug, channel: getChannel() }).toPromise(),
      LIVE_TIMEOUT_MS,
      "product metadata query",
    );
    // urql resolves (not rejects) on network/GraphQL errors.
    if (result.error) throw result.error;
    const product = result.data?.product;
    if (!product) {
      return { title: "Product Not Found" };
    }
    return {
      title: product.seoTitle || product.name,
      description: product.seoDescription || product.description,
      alternates: {
        canonical: `${siteConfig.url}/products/${slug}`,
      },
      openGraph: {
        title: product.seoTitle || product.name,
        description: product.seoDescription || product.description,
        images: product.images?.[0] ? [product.images[0].url] : [],
      },
    };
  } catch {
    const snap = loadProductSnapshot(slug);
    if (!snap) return { title: "Product" };
    const snapDescription = snap.seoDescription || snap.description || undefined;
    return {
      title: snap.seoTitle || snap.name,
      description: snapDescription,
      alternates: {
        canonical: `${siteConfig.url}/products/${slug}`,
      },
      openGraph: {
        title: snap.seoTitle || snap.name,
        description: snapDescription,
        images: snap.images?.[0] ? [snap.images[0].url] : [],
      },
    };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const client = getSaleorClient();
  const channel = getChannel();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let product: any = null;
  let fromSnapshot = false;
  try {
    const result = await withTimeout(
      client.query(PRODUCT_DETAIL_QUERY, { slug, channel }).toPromise(),
      LIVE_TIMEOUT_MS,
      `product query slug=${slug}`,
    );
    // urql resolves (not rejects) on network/GraphQL errors.
    if (result.error) throw result.error;
    product = result.data?.product ?? null;
  } catch (error) {
    console.error("Live product query failed, falling back to snapshot:", error);
    const snap = loadProductSnapshot(slug);
    if (snap) {
      product = snapshotToProduct(snap);
      fromSnapshot = true;
    }
  }

  if (!product) {
    notFound();
  }

  let relatedProducts: ProductCardProduct[] = [];
  if (product.category?.id && !fromSnapshot) {
    try {
      const relatedResult = await withTimeout(
        client
          .query(RELATED_PRODUCTS_QUERY, { channel, categoryId: product.category.id })
          .toPromise(),
        LIVE_TIMEOUT_MS,
        "related products query",
      );
      // urql resolves (not rejects) on network/GraphQL errors.
      if (relatedResult.error) throw relatedResult.error;
      relatedProducts = (relatedResult.data?.products?.edges ?? [])
        .map((e: { node: ProductCardProduct }) => e.node)
        .filter((p: ProductCardProduct) => p.id !== product.id)
        .slice(0, 4);
    } catch (error) {
      console.error("Live related query failed, falling back to snapshot:", error);
    }
  }
  if (relatedProducts.length === 0) {
    // Same-category snapshot neighbours (or any 4 when category unknown).
    const snap = loadCatalogSnapshot() ?? [];
    const catSlug: string | undefined =
      product.category?.slug ?? loadProductSnapshot(slug)?.category?.slug ?? undefined;
    const pool = snap.filter((p) => p.id !== product.id);
    const sameCat = catSlug ? pool.filter((p) => p.categorySlug === catSlug) : [];
    const fill = pool.filter((p) => !sameCat.includes(p));
    relatedProducts = [...sameCat, ...fill].slice(0, 4).map(toCardProduct);
  }

  return (
    <ProductDetailClient
      product={product}
      relatedProducts={relatedProducts}
      snapshotNotice={fromSnapshot}
    />
  );
}
