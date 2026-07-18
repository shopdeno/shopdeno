import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getSaleorClient, getChannel } from "@/lib/saleor";
import { COLLECTION_DETAIL_QUERY, PRODUCTS_QUERY } from "@/graphql/queries";
import { toProductOrder } from "@/lib/product-sort";
import { ProductGrid } from "./ProductGrid";
import { siteConfig } from "@/lib/site-config";

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const client = getSaleorClient();
  const channel = getChannel();

  try {
    const result = await client.query(COLLECTION_DETAIL_QUERY, {
      slug,
      channel,
    });

    const collection = result.data?.collection;

    if (!collection) {
      return { title: "Collection Not Found" };
    }

    return {
      title: collection.seoTitle || collection.name,
      description: collection.seoDescription || collection.description,
      alternates: {
        canonical: `${siteConfig.url}/collections/${slug}`,
      },
    };
  } catch {
    return { title: "Collection" };
  }
}

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const { slug } = await params;
  const { page, sort } = await searchParams;
  const client = getSaleorClient();
  const channel = getChannel();
  const pageNumber = parseInt(page || "1", 10);
  const pageSize = 12;

  try {
    // Need the collection id to scope the product query, so fetch it first.
    const collectionResult = await client.query(COLLECTION_DETAIL_QUERY, {
      slug,
      channel,
    });
    const collection = collectionResult.data?.collection;

    if (!collection) {
      console.log("Collection not found for slug:", slug);
      notFound();
    }

    const productsResult = await client.query(PRODUCTS_QUERY, {
      channel,
      first: pageSize,
      // Scope to THIS collection (was `filter: {}`, which returned all products).
      filter: { collections: [collection.id] },
      sortBy: toProductOrder(sort, channel),
      // TODO: real forward-cursor pagination — ProductGrid currently uses page
      // numbers; wire endCursor through the URL to support pages beyond 1.
    });

    const products = productsResult.data?.products?.edges || [];
    const pageInfo = productsResult.data?.products?.pageInfo;

    return (
      <ProductGrid
        collection={collection}
        products={products}
        pageInfo={pageInfo}
        currentPage={pageNumber}
        currentSort={sort}
      />
    );
  } catch (error) {
    console.error("Error fetching collection:", error);
    notFound();
  }
}
