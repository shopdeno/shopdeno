import { Metadata } from "next";
import { getSaleorClient, getChannel } from "@/lib/saleor";
import { SACCO_LANDING_QUERY } from "@/graphql/queries";
import { SACCO_CATEGORY_SLUGS } from "@/lib/browse-config";
import { SaccoCard } from "@/components/SaccoCard";
import { siteConfig } from "@/lib/site-config";
import { loadCatalogSnapshot } from "@/lib/catalog-snapshot";
import { sizedImageUrl } from "@/lib/imageUtils";
import { LIVE_TIMEOUT_MS } from "@/lib/live-timeout";

export const metadata: Metadata = {
  title: `Shop SACCO | ${siteConfig.name}`,
  description: "Browse Dennis Muraguri's matatu art prints organised by Nairobi SACCO and route.",
  alternates: {
    canonical: `${siteConfig.url}/saccos`,
  },
};

// Hourly ISR + the public/catalog snapshot fallback keep this page populated
// even when the free-tier Saleor API is asleep (cold start ~60s).
export const revalidate = 3600;

interface SaccoView {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  images: string[];
}

const SACCO_SET = new Set<string>(SACCO_CATEGORY_SLUGS as readonly string[]);

/** Rebuild the SACCO landing tiles from the cold-start snapshot. */
function saccosFromSnapshot(): SaccoView[] {
  const snap = loadCatalogSnapshot();
  if (!snap) return [];
  const byCat = new Map<string, SaccoView>();
  for (const p of snap) {
    if (!p.categorySlug || !SACCO_SET.has(p.categorySlug)) continue;
    let s = byCat.get(p.categorySlug);
    if (!s) {
      s = { id: p.categorySlug, name: p.categoryName ?? p.categorySlug, slug: p.categorySlug, images: [] };
      byCat.set(p.categorySlug, s);
    }
    const img = p.imageUrl ?? p.thumbnail?.url;
    if (img && s.images.length < 4) s.images.push(sizedImageUrl(img, 512));
  }
  return [...byCat.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export default async function SaccosPage() {
  const client = getSaleorClient();
  const channel = getChannel();

  let saccos: SaccoView[] = [];
  try {
    const result = await Promise.race([
      client.query(SACCO_LANDING_QUERY, { first: 100, channel }).toPromise(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`SACCO query timed out after ${LIVE_TIMEOUT_MS}ms`)), LIVE_TIMEOUT_MS),
      ),
    ]);
    if (result.error) throw result.error;
    interface CategoryNode {
      id: string;
      name: string;
      slug: string;
      description?: string | null;
      products: { edges: { node: { thumbnail: { url: string; alt?: string | null } | null } }[] };
    }
    const allEdges: { node: CategoryNode }[] = result.data?.categories?.edges || [];
    saccos = allEdges
      .filter(({ node }) => SACCO_SET.has(node.slug))
      .map(({ node }) => ({
        id: node.id,
        name: node.name,
        slug: node.slug,
        description: node.description,
        images: node.products.edges
          .map(({ node: n }) => n.thumbnail?.url)
          .filter((url): url is string => !!url),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (saccos.length === 0) throw new Error("no SACCO categories in live response");
  } catch (error) {
    console.error("Live SACCO query failed, falling back to snapshot:", error);
    saccos = saccosFromSnapshot();
  }

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
            {saccos.map((sacco, i) => (
              <SaccoCard
                key={sacco.id}
                name={sacco.name}
                slug={sacco.slug}
                images={sacco.images}
                index={i}
                description={sacco.description}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
