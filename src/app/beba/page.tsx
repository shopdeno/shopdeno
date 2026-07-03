import { Metadata } from "next";
import { getSaleorClient, getChannel } from "@/lib/saleor";
import { PRODUCTS_QUERY } from "@/graphql/queries";
import { toProductOrder } from "@/lib/product-sort";
import { ProductCard, type ProductCardProduct } from "@/components/ProductCard";
import { SortSelect } from "@/components/SortSelect";
import { siteConfig } from "@/lib/site-config";
import { CATEGORY_DETAIL_QUERY } from "@/graphql/queries";

export const metadata: Metadata = {
  title: `Shop BEBA | ${siteConfig.name}`,
  description: "Beba Bei matatu art prints by Dennis Muraguri.",
};

export default async function BebaPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const client = getSaleorClient();
  const channel = getChannel();

  const catResult = await client.query(CATEGORY_DETAIL_QUERY, { slug: "beba" });
  const category = catResult.data?.category;

  let products: { node: ProductCardProduct }[] = [];
  if (category) {
    const result = await client.query(PRODUCTS_QUERY, {
      channel,
      first: 100,
      filter: { categories: [category.id] },
      sortBy: toProductOrder(sort, channel),
    });
    products = result.data?.products?.edges || [];
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
              <p className="text-sm text-gray-500">{products.length} print{products.length !== 1 ? "s" : ""}</p>
              <SortSelect current={sort ?? ""} />
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
