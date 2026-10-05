import { Metadata } from "next";
import { getSaleorClient, getChannel } from "@/lib/saleor";
import { PRODUCTS_QUERY, CATEGORY_DETAIL_QUERY } from "@/graphql/queries";
import { toProductOrder } from "@/lib/product-sort";
import { ProductCard, type ProductCardProduct } from "@/components/ProductCard";
import { SortSelect } from "@/components/SortSelect";
import { siteConfig } from "@/lib/site-config";
import {
  loadCatalogSnapshot,
  sortSnapshot,
  toCardProduct,
  type SnapshotLight,
} from "@/lib/catalog-snapshot";
import { LIVE_TIMEOUT_MS } from "@/lib/live-timeout";

export const metadata: Metadata = {
  title: `Shop BEBA | ${siteConfig.name}`,
  description: "Beba Bei matatu art prints by Dennis Muraguri.",
};

// Hourly ISR + the public/catalog snapshot fallback keep this page populated
// even when the free-tier Saleor API is asleep (cold start ~60s).
export const revalidate = 3600;

export default async function BebaPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort = "NAME" } = await searchParams;
  const client = getSaleorClient();
  const channel = getChannel();

  let products: { node: ProductCardProduct }[] = [];
  let fromSnapshot = false;

  try {
    const catResult = await Promise.race([
      client.query(CATEGORY_DETAIL_QUERY, { slug: "beba" }).toPromise(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`category query timed out after ${LIVE_TIMEOUT_MS}ms`)), LIVE_TIMEOUT_MS),
      ),
    ]);
    if (catResult.error) throw catResult.error;
    const category = catResult.data?.category;
    if (!category) throw new Error("beba category not found");

    const result = await Promise.race([
      client
        .query(PRODUCTS_QUERY, {
          channel,
          first: 100,
          filter: { categories: [category.id] },
          sortBy: toProductOrder(sort, channel),
        })
        .toPromise(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`products query timed out after ${LIVE_TIMEOUT_MS}ms`)), LIVE_TIMEOUT_MS),
      ),
    ]);
    if (result.error) throw result.error;
    products = result.data?.products?.edges || [];
  } catch (error) {
    console.error("Live BEBA query failed, falling back to snapshot:", error);
    const snap: SnapshotLight[] | null = loadCatalogSnapshot();
    if (snap) {
      const beba = snap.filter((p) => p.categorySlug?.includes("beba"));
      products = sortSnapshot(beba, sort).map((p) => ({ node: toCardProduct(p) }));
      fromSnapshot = true;
    }
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Shop BEBA</h1>
          <p className="mt-4 text-lg text-gray-500">
            Beba Bei matatu art prints by Dennis Muraguri.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="mt-12 text-center text-gray-500">No prints found.</div>
        ) : (
          <>
            <div className="mt-10 flex items-center justify-between">
              <p className="text-sm text-gray-500" data-catalog-source={fromSnapshot ? "snapshot" : "live"}>
                {products.length} print{products.length !== 1 ? "s" : ""}
                {fromSnapshot && " · saved view"}
              </p>
              <SortSelect current={sort} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:gap-x-8">
              {products.map(({ node }) => (
                <ProductCard key={node.id} product={node} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
