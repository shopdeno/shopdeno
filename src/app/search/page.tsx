import { Metadata } from "next";
import { getSaleorClient, getChannel } from "@/lib/saleor";
import { PRODUCTS_QUERY } from "@/graphql/queries";
import { ProductCard, type ProductCardProduct } from "@/components/ProductCard";
import { SearchBox } from "@/components/SearchBox";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Search",
  description: "Search matatu and sacco art prints.",
  alternates: {
    canonical: `${siteConfig.url}/search`,
  },
  robots: {
    index: false,
  },
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = (q || "").trim();
  const channel = getChannel();

  let products: { node: ProductCardProduct }[] = [];
  if (query) {
    try {
      const result = await getSaleorClient().query(PRODUCTS_QUERY, {
        channel,
        first: 48,
        filter: { search: query },
      });
      products = result.data?.products?.edges || [];
    } catch (error) {
      console.error("Error searching products:", error);
    }
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Search</h1>
        <div className="mt-6">
          <SearchBox initialQuery={query} />
        </div>

        {query && (
          <p className="mt-6 text-sm text-gray-500">
            {products.length} result{products.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </p>
        )}

        {query && products.length === 0 ? (
          <div className="mt-12 text-center text-gray-500">
            No products match your search.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:gap-x-8">
            {products.map(({ node }) => (
              <ProductCard key={node.id} product={node} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
