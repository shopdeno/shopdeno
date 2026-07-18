import { Metadata } from "next";
import { getSaleorClient, getChannel } from "@/lib/saleor";
import { PRODUCTS_QUERY } from "@/graphql/queries";
import { ProductCard, type ProductCardProduct } from "@/components/ProductCard";
import { SortSelect } from "@/components/SortSelect";
import { toProductOrder } from "@/lib/product-sort";
import { siteConfig, FEATURED_SLUGS } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Shop DENO",
  description: `Browse all matatu and sacco art prints from ${siteConfig.name}.`,
  alternates: {
    canonical: `${siteConfig.url}/products`,
  },
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort = "NAME" } = await searchParams;
  const client = getSaleorClient();
  const channel = getChannel();

  let products: { node: ProductCardProduct }[] = [];
  try {
    const result = await client.query(PRODUCTS_QUERY, {
      channel,
      first: 100,
      sortBy: toProductOrder(sort, channel),
    });
    const edges = result.data?.products?.edges || [];
    const featured = edges.filter((e: any) => FEATURED_SLUGS.has(e.node.slug) && !e.node.category?.slug?.includes("beba"));
    const rest = edges.filter((e: any) => !FEATURED_SLUGS.has(e.node.slug) && !e.node.category?.slug?.includes("beba"));
    const beba = edges.filter((e: any) => e.node.category?.slug?.includes("beba"));
    products = [...featured, ...rest, ...beba];
  } catch (error) {
    console.error("Error fetching products:", error);
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
              <p className="text-sm text-gray-500">{products.length} prints</p>
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
