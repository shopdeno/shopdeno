import { Metadata } from "next";
import { getSaleorClient, getChannel } from "@/lib/saleor";
import { SACCO_LANDING_QUERY } from "@/graphql/queries";
import { SACCO_CATEGORY_SLUGS } from "@/lib/browse-config";
import { SaccoCard } from "@/components/SaccoCard";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `Shop SACCO | ${siteConfig.name}`,
  description: "Browse Dennis Muraguri's matatu art prints organised by Nairobi SACCO and route.",
};

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  products: {
    edges: { node: { thumbnail: { url: string; alt?: string | null } | null } }[];
  };
}

export default async function SaccosPage() {
  const client = getSaleorClient();
  const channel = getChannel();

  try {
    const result = await client.query(SACCO_LANDING_QUERY, { first: 100, channel });
    const allEdges: { node: CategoryNode }[] = result.data?.categories?.edges || [];

    const saccos = allEdges
      .filter(({ node }) => (SACCO_CATEGORY_SLUGS as readonly string[]).includes(node.slug))
      .map(({ node }) => node)
      .sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Shop SACCO</h1>
            <p className="mt-4 text-lg text-gray-500">
              Nairobi&apos;s matatu art, organised by the saccos and routes that inspired it.
            </p>
          </div>

          {saccos.length === 0 ? (
            <div className="mt-12 text-center text-gray-500">No SACCOs found.</div>
          ) : (
            <div className="mt-12 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
              {saccos.map((sacco, i) => {
                const images = sacco.products.edges
                  .map(({ node }) => node.thumbnail?.url)
                  .filter((url): url is string => !!url);
                return (
                  <SaccoCard
                    key={sacco.id}
                    name={sacco.name}
                    slug={sacco.slug}
                    images={images}
                    index={i}
                    description={sacco.description}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching SACCO categories:", error);
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-center text-gray-500">Unable to load SACCOs.</p>
      </div>
    );
  }
}
