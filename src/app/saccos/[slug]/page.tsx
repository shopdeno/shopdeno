import { Metadata } from "next";
import { notFound } from "next/navigation";

function editorJsToHtml(raw?: string | null): string {
  if (!raw) return "";
  try {
    const doc = JSON.parse(raw);
    if (!Array.isArray(doc?.blocks)) return "";
    return doc.blocks.map((b: { type: string; data: Record<string, unknown> }) => {
      if (b.type === "paragraph") return `<p>${b.data.text}</p>`;
      if (b.type === "header") return `<h${b.data.level}>${b.data.text}</h${b.data.level}>`;
      return "";
    }).join("");
  } catch {
    return "";
  }
}
import Image from "next/image";
import Link from "next/link";
import { getSaleorClient, getChannel } from "@/lib/saleor";
import { CATEGORY_DETAIL_QUERY, PRODUCTS_QUERY } from "@/graphql/queries";
import { toProductOrder } from "@/lib/product-sort";
import { ProductCard, type ProductCardProduct } from "@/components/ProductCard";
import { getBlurDataURL } from "@/lib/imageUtils";
import { siteConfig } from "@/lib/site-config";

interface SaccoPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}

export async function generateMetadata({ params }: SaccoPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const result = await getSaleorClient().query(CATEGORY_DETAIL_QUERY, { slug });
    const category = result.data?.category;
    if (!category) return { title: "SACCO Not Found" };
    return {
      title: category.seoTitle || `${category.name} Prints`,
      description: category.seoDescription || undefined,
      alternates: {
        canonical: `${siteConfig.url}/categories/${slug}`,
      },
    };
  } catch {
    return { title: "SACCO" };
  }
}

export default async function SaccoPage({ params, searchParams }: SaccoPageProps) {
  const { slug } = await params;
  const { sort } = await searchParams;
  const client = getSaleorClient();
  const channel = getChannel();

  let category = null;
  try {
    const categoryResult = await client.query(CATEGORY_DETAIL_QUERY, { slug });
    category = categoryResult.data?.category ?? null;
  } catch (error) {
    console.error("SLUG_NOT_FOUND sacco slug=%s error=%s", slug, error);
    notFound();
  }

  if (!category) {
    notFound();
  }

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
            blurDataURL={getBlurDataURL()}
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-4xl font-bold text-white">{category.name}</h1>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8">
          <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-gray-700">Home</Link>
            <span>/</span>
            <Link href="/saccos" className="hover:text-gray-700">Shop SACCO</Link>
            <span>/</span>
            <span className="text-gray-900">{category.name}</span>
          </nav>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{category.name}</h1>
          {category.description && (
            <div
              className="mt-2 max-w-3xl text-lg text-gray-500 prose"
              dangerouslySetInnerHTML={{ __html: editorJsToHtml(category.description) }}
            />
          )}
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm text-gray-500">
          {products.length} print{products.length !== 1 ? "s" : ""}
        </p>
        {products.length === 0 ? (
          <div className="mt-12 text-center text-gray-500">No prints in this SACCO yet.</div>
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
}
