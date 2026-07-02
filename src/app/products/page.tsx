import { Metadata } from "next";
import { getSaleorClient, getChannel } from "@/lib/saleor";
import { PRODUCTS_QUERY } from "@/graphql/queries";
import { ProductCard, type ProductCardProduct } from "@/components/ProductCard";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Shop All",
  description: `Browse all matatu and sacco art prints from ${siteConfig.name}.`,
};

export default async function ProductsPage() {
  const client = getSaleorClient();
  const channel = getChannel();

  let products: { node: ProductCardProduct }[] = [];
  try {
    const result = await client.query(PRODUCTS_QUERY, {
      channel,
      first: 100,
      sortBy: { field: "PUBLICATION_DATE", direction: "DESC" },
    });
    products = result.data?.products?.edges || [];
  } catch (error) {
    console.error("Error fetching products:", error);
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Shop All</h1>
          <p className="mt-4 text-lg text-gray-500">
            Every matatu and sacco art print, all in one place.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="mt-12 text-center text-gray-500">No products found.</div>
        ) : (
          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:gap-x-8">
            {products.map(({ node }) => (
              <ProductCard key={node.id} product={node} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
