import { Metadata } from "next";
import { getSaleorClient, getChannel } from "@/lib/saleor";
import { PRODUCTS_QUERY } from "@/graphql/queries";
import { ProductCard, type ProductCardProduct } from "@/components/ProductCard";
import { SortSelect } from "@/components/SortSelect";
import { toProductOrder } from "@/lib/product-sort";
import { siteConfig, FEATURED_SLUGS } from "@/lib/site-config";
import {
  loadCatalogSnapshot,
  sortSnapshot,
  toCardProduct,
  type SnapshotLight,
} from "@/lib/catalog-snapshot";
import { LIVE_TIMEOUT_MS } from "@/lib/live-timeout";

export const metadata: Metadata = {
  title: "Shop DENO",
  description: `Browse all matatu and sacco art prints from ${siteConfig.name}.`,
  alternates: {
    canonical: `${siteConfig.url}/products`,
  },
};

// Hourly ISR: Vercel serves the edge-cached grid instantly; the snapshot
// (public/catalog/catalog.json, refreshed nightly) covers Render cold starts.
export const revalidate = 3600;



function orderNodes<T extends { slug: string; categorySlug?: string | null }>(
  nodes: T[],
): T[] {
  const featured = nodes.filter(
    (n) => FEATURED_SLUGS.has(n.slug) && !n.categorySlug?.includes("beba"),
  );
  const rest = nodes.filter(
    (n) => !FEATURED_SLUGS.has(n.slug) && !n.categorySlug?.includes("beba"),
  );
  const beba = nodes.filter((n) => n.categorySlug?.includes("beba"));
  return [...featured, ...rest, ...beba];
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort = "NAME" } = await searchParams;
  const client = getSaleorClient();
  const channel = getChannel();

  let products: { node: ProductCardProduct }[] = [];
  let fromSnapshot = false;

  const liveQuery = client
    .query(PRODUCTS_QUERY, {
      channel,
      first: 100,
      sortBy: toProductOrder(sort, channel),
    })
    .toPromise();
  try {
    const result = await Promise.race([
      liveQuery,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`live Saleor timed out after ${LIVE_TIMEOUT_MS}ms`)),
          LIVE_TIMEOUT_MS,
        ),
      ),
    ]);
    // urql resolves (not rejects) on network/GraphQL errors — surface them
    // so the snapshot fallback below engages instead of rendering empty.
    if (result.error) throw result.error;
    type Edge = { node: ProductCardProduct & { category?: { slug?: string } | null } };
    const edges: Edge[] = result.data?.products?.edges || [];
    const featured = edges.filter(
      (e) => FEATURED_SLUGS.has(e.node.slug) && !e.node.category?.slug?.includes("beba"),
    );
    const rest = edges.filter(
      (e) => !FEATURED_SLUGS.has(e.node.slug) && !e.node.category?.slug?.includes("beba"),
    );
    const beba = edges.filter((e) => e.node.category?.slug?.includes("beba"));
    products = [...featured, ...rest, ...beba];
  } catch (error) {
    console.error("Live products query failed, falling back to snapshot:", error);
    const snap: SnapshotLight[] | null = loadCatalogSnapshot();
    if (snap) {
      const ordered = orderNodes(sortSnapshot(snap, sort));
      products = ordered.map((p) => ({ node: toCardProduct(p) }));
      fromSnapshot = true;
    } else {
      console.error("No catalog snapshot available at public/catalog/catalog.json");
    }
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Shop DENO</h1>
          <p className="mt-4 text-lg text-gray-500">
            Every matatu and sacco art print, all in one place.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="mt-12 text-center text-gray-500">No products found.</div>
        ) : (
          <>
            <div className="mt-10 flex items-center justify-between">
              <p className="text-sm text-gray-500" data-catalog-source={fromSnapshot ? "snapshot" : "live"}>
                {products.length} prints
                {fromSnapshot && " · saved view"}
              </p>
              <SortSelect current={sort} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:gap-x-8">
              {products.map(({ node }, i) => (
                <ProductCard key={node.id} product={node} priority={i < 4} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
