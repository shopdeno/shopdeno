import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getSaleorClient, getChannel } from "@/lib/saleor";
import { CATEGORY_DETAIL_QUERY, PRODUCTS_QUERY } from "@/graphql/queries";
import { toProductOrder } from "@/lib/product-sort";
import { ProductCard, type ProductCardProduct } from "@/components/ProductCard";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const result = await getSaleorClient().query(CATEGORY_DETAIL_QUERY, { slug });
    const category = result.data?.category;
    if (!category) return { title: "Category Not Found" };
    return {
      title: category.seoTitle || category.name,
      description: category.seoDescription || undefined,
    };
  } catch {
    return { title: "Category" };
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const { sort } = await searchParams;
  const client = getSaleorClient();
  const channel = getChannel();

  try {
    const categoryResult = await client.query(CATEGORY_DETAIL_QUERY, { slug });
    const category = categoryResult.data?.category;
    if (!category) notFound();

    const productsResult = await client.query(PRODUCTS_QUERY, {
      channel,
      first: 48,
      filter: { categories: [category.id] },
      sortBy: toProductOrder(sort, channel),
    });
    const products: { node: ProductCardProduct }[] = productsResult.data?.products?.edges || [];

    return (
      <div className="bg-white">
        {category.backgroundImage ? (
          <div className="relative h-64 w-full md:h-80">
            <Image
              src={category.backgroundImage.url}
              alt={category.backgroundImage.alt || category.name}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex items-center justify-center">
              <h1 className="text-4xl font-bold text-white">{category.name}</h1>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{category.name}</h1>
            {category.description && (
              <p className="mt-2 max-w-3xl text-lg text-gray-500">{category.description}</p>
            )}
          </div>
        )}

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-sm text-gray-500">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
          {products.length === 0 ? (
            <div className="mt-12 text-center text-gray-500">No products in this category.</div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:gap-x-8">
              {products.map(({ node }) => (
                <ProductCard key={node.id} product={node} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching category:", error);
    notFound();
  }
}
