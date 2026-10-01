import { getSaleorClient, getChannel } from "@/lib/saleor";
import { PRODUCTS_QUERY } from "@/graphql/queries";
import { loadCatalogSnapshot, toCardProduct } from "@/lib/catalog-snapshot";
import { LIVE_TIMEOUT_MS } from "@/lib/live-timeout";
import HomeClient from "./HomeClient";

// Hourly ISR: the homepage grid is server-rendered from the live catalog when
// reachable, else from the static snapshot (public/catalog/catalog.json). Either
// way the client receives products as a prop and renders instantly — no skeleton,
// no client-side Saleor fetch that hangs when the backend is asleep or down.
export const revalidate = 3600;

export default async function HomePage() {
  const client = getSaleorClient();
  const channel = getChannel();

  let products: { node: any }[] = [];

  const liveQuery = client
    .query(PRODUCTS_QUERY, {
      channel,
      first: 100,
      sortBy: { field: "PUBLICATION_DATE", direction: "DESC" },
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
    // urql resolves (not rejects) on network/GraphQL errors — surface them so
    // the snapshot fallback engages instead of shipping an empty homepage.
    if (result.error) throw result.error;
    products = result.data?.products?.edges ?? [];
    if (products.length === 0) throw new Error("live Saleor returned no products");
  } catch (error) {
    console.error("Home: live products query failed, falling back to snapshot:", error);
    const snap = loadCatalogSnapshot();
    if (snap) {
      products = snap.map((p) => ({
        node: {
          ...toCardProduct(p),
          category: p.categorySlug ? { slug: p.categorySlug } : null,
        },
      }));
    } else {
      console.error("Home: no catalog snapshot available at public/catalog/catalog.json");
    }
  }

  return <HomeClient initialProducts={products} />;
}
