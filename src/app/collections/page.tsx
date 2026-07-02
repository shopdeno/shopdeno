import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSaleorClient } from "@/lib/saleor";
import { COLLECTIONS_QUERY } from "@/graphql/queries";

const SITE_NAME = "Store";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://yourstore.com";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Collections",
    description: "Browse our product collections",
    openGraph: {
      title: "Collections - " + SITE_NAME,
      description: "Browse our product collections",
      url: `${SITE_URL}/collections`,
    },
  };
}

export default async function CollectionsPage() {
  const client = getSaleorClient();

  try {
    const result = await client.query(COLLECTIONS_QUERY, {
      channel: "default-channel",
      first: 20,
    });

    const collections = result.data?.collections?.edges || [];

    return (
      <div className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Our Collections
            </h1>
            <p className="mt-4 text-lg text-gray-500">
              Browse our carefully curated collections
            </p>
          </div>

          {collections.length === 0 ? (
            <div className="mt-12 text-center text-gray-500">
              No collections found.
            </div>
          ) : (
            <div className="mt-12 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
              {collections.map(({ node }: any) => (
                <Link
                  key={node.id}
                  href={`/collections/${node.slug}`}
                  className="group"
                >
                  <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100 relative">
                    {node.backgroundImage ? (
                      <Image
                        src={node.backgroundImage.url}
                        alt={node.backgroundImage.alt || node.name}
                        fill
                        className="object-cover object-center group-hover:opacity-75 transition-opacity"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gray-200">
                        <span className="text-gray-400">No Image</span>
                      </div>
                    )}
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    {node.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {node.description || "Browse collection"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching collections:", error);
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-center text-gray-500">Unable to load collections.</p>
      </div>
    );
  }
}
