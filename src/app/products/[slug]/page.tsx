import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSaleorClient, getChannel } from "@/lib/saleor";
import { PRODUCT_DETAIL_QUERY, RELATED_PRODUCTS_QUERY } from "@/graphql/queries";
import { ProductDetailClient } from "./ProductDetailClient";
import type { ProductCardProduct } from "@/components/ProductCard";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const client = getSaleorClient();
  
  try {
    const result = await client.query(PRODUCT_DETAIL_QUERY, {
      slug,
      channel: getChannel(),
    });
    
    const product = result.data?.product;
    
    if (!product) {
      return { title: "Product Not Found" };
    }
    
    return {
      title: product.seoTitle || product.name,
      description: product.seoDescription || product.description,
      openGraph: {
        title: product.seoTitle || product.name,
        description: product.seoDescription || product.description,
        images: product.images?.[0] ? [product.images[0].url] : [],
      },
    };
  } catch {
    return { title: "Product" };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const client = getSaleorClient();
  const channel = getChannel();

  try {
    const result = await client.query(PRODUCT_DETAIL_QUERY, { slug, channel });
    const product = result.data?.product;

    if (!product) {
      notFound();
    }

    let relatedProducts: ProductCardProduct[] = [];
    if (product.category?.id) {
      const relatedResult = await client.query(RELATED_PRODUCTS_QUERY, {
        channel,
        categoryId: product.category.id,
      });
      relatedProducts = (relatedResult.data?.products?.edges ?? [])
        .map((e: { node: ProductCardProduct }) => e.node)
        .filter((p: ProductCardProduct) => p.id !== product.id)
        .slice(0, 4);
    }

    return <ProductDetailClient product={product} relatedProducts={relatedProducts} />;
  } catch (error) {
    console.error("Error fetching product:", error);
    notFound();
  }
}
