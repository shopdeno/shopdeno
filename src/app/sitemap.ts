import { MetadataRoute } from "next";
import { gql } from "graphql-tag";
import { getSaleorClient } from "@/lib/saleor";
import { PRODUCTS_QUERY, COLLECTIONS_QUERY } from "@/graphql/queries";
import { SACCO_CATEGORY_SLUGS } from "@/lib/browse-config";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://yourstore.com";

const CATEGORIES_LIST_QUERY = gql`
  query CategoriesList($first: Int!) {
    categories(first: $first) {
      edges {
        node {
          slug
          updatedAt
        }
      }
    }
  }
`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const client = getSaleorClient();
  const baseUrl = SITE_URL;

  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/collections`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    ...["/faq", "/contact", "/shipping-and-delivery", "/refund-returns", "/privacy-policy", "/cookies-policy", "/term-and-conditions"].map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.4,
    })),
  ];

  try {
    const channel = process.env.NEXT_PUBLIC_SALEOR_CHANNEL || "default-channel";
    const [productsResult, collectionsResult, categoriesResult] = await Promise.all([
      client.query(PRODUCTS_QUERY, { channel, first: 200 }),
      client.query(COLLECTIONS_QUERY, { channel, first: 100 }),
      client.query(CATEGORIES_LIST_QUERY, { first: 100 }),
    ]);

    const productUrls = productsResult.data?.products?.edges?.map(
      ({ node }: { node: { slug: string; updatedAt?: string } }) => ({
        url: `${baseUrl}/products/${node.slug}`,
        lastModified: node.updatedAt ? new Date(node.updatedAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })
    ) || [];

    const collectionUrls = collectionsResult.data?.collections?.edges?.map(
      ({ node }: { node: { slug: string } }) => ({
        url: `${baseUrl}/collections/${node.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })
    ) || [];

    // Only include categories relevant to the art shop — excludes Saleor demo/scaffold
    // categories (accessories, audiobooks, apparel, etc.) which have no products and
    // would be flagged as "Crawled — currently not indexed" by Google.
    const ALLOWED_CATEGORY_SLUGS = new Set<string>([
      ...SACCO_CATEGORY_SLUGS,
      "dennis-muraguri-matatu-woodcut-prints-reproductions-on-paper",
      "beba",
    ]);

    const categoryUrls = (categoriesResult.data?.categories?.edges || [])
      .filter(({ node }: { node: { slug: string } }) => ALLOWED_CATEGORY_SLUGS.has(node.slug))
      .map(({ node }: { node: { slug: string; updatedAt?: string } }) => ({
        url: `${baseUrl}/categories/${node.slug}`,
        lastModified: node.updatedAt ? new Date(node.updatedAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));

    // /saccos/{slug} pages canonicalise to /categories/{slug}, so exclude them from
    // the sitemap to avoid signalling duplicate content to Google.
    const saccoUrls = [
      { url: `${baseUrl}/saccos`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
    ];

    return [...staticPages, ...productUrls, ...categoryUrls, ...collectionUrls, ...saccoUrls];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return staticPages;
  }
}
