#!/usr/bin/env node
/**
 * Export a static catalog snapshot from Saleor into public/catalog/.
 *
 * Why: the Render self-host sleeps after ~15 min idle (~60s cold start).
 * Image bytes already live on Supabase Storage (fast), but today the
 * storefront only learns image URLs + product info via live GraphQL — so a
 * sleeping backend means a blank grid. This snapshot lets PLP/PDP render
 * instantly from Vercel edge cache and revalidate live afterwards.
 *
 * Output:
 *   public/catalog/meta.json      { generatedAt, count, channel }
 *   public/catalog/catalog.json   light entries for /products grid
 *   public/catalog/<slug>.json    full detail per product for /products/[slug]
 *
 * Usage:
 *   SALEOR_URL=https://shopdeno-saleor-api.onrender.com/graphql/ \
 *   CHANNEL=default-channel node scripts/export-catalog-snapshot.mjs
 *   # or: npm run catalog:snapshot  (reads NEXT_PUBLIC_SALEOR_API_URL from .env)
 *
 * The script tolerates Render cold starts: each request retries with backoff
 * up to ~3 min before giving up.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SALEOR_URL =
  process.env.SALEOR_URL || process.env.NEXT_PUBLIC_SALEOR_API_URL || "";
const CHANNEL =
  process.env.CHANNEL || process.env.NEXT_PUBLIC_SALEOR_CHANNEL || "default-channel";
const OUT_DIR = process.env.OUT_DIR || join(process.cwd(), "public", "catalog");

if (!SALEOR_URL) {
  console.error(
    "Set SALEOR_URL (or NEXT_PUBLIC_SALEOR_API_URL). Example:\n" +
      "  SALEOR_URL=https://shopdeno-saleor-api.onrender.com/graphql/ node scripts/export-catalog-snapshot.mjs"
  );
  process.exit(1);
}

// NOTE: sortBy must be a ProductOrder object, not a bare string (Saleor gotcha).
// It must be passed as a VARIABLE — enum values inlined as quoted strings in
// the document are invalid GraphQL (enums are unquoted literals).
const SNAPSHOT_QUERY = /* GraphQL */ `
  query CatalogSnapshot($channel: String!, $first: Int!, $after: String, $sortBy: ProductOrder) {
    products(channel: $channel, first: $first, after: $after, sortBy: $sortBy) {
      edges {
        node {
          id
          name
          slug
          seoTitle
          seoDescription
          description
          descriptionJson
          rating
          isAvailableForPurchase
          availableForPurchase
          thumbnail(size: 512) {
            url
            alt
          }
          media {
            id
            url
            alt
          }
          pricing {
            priceRange {
              start {
                gross {
                  amount
                  currency
                }
              }
            }
            priceRangeUndiscounted {
              start {
                gross {
                  amount
                  currency
                }
              }
            }
          }
          category {
            id
            name
            slug
          }
          variants {
            id
            name
            sku
            quantityAvailable
            media {
              id
              url
              alt
            }
            attributes {
              attribute {
                id
                name
                slug
              }
              values {
                id
                name
                value
                slug
              }
            }
            pricing {
              price {
                gross {
                  amount
                  currency
                }
              }
              priceUndiscounted {
                gross {
                  amount
                  currency
                }
              }
            }
          }
          attributes {
            attribute {
              id
              name
              slug
            }
            values {
              id
              name
              value
              slug
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gqlWithRetry(query, variables, attempts = 6) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      // Saleor serves the GraphiQL playground HTML on GET — must POST.
      const res = await fetch(SALEOR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(90_000),
      });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Non-JSON response (HTTP ${res.status}) — backend may still be waking up`);
      }
      if (json.errors) throw new Error("GQL error: " + JSON.stringify(json.errors).slice(0, 500));
      return json.data;
    } catch (e) {
      lastErr = e;
      const wait = Math.min(10_000 * 2 ** i, 60_000);
      console.log(`  attempt ${i + 1}/${attempts} failed (${e.message}). Retrying in ${wait / 1000}s…`);
      await sleep(wait);
    }
  }
  throw lastErr;
}

const toHttps = (u) => (u != null && u.startsWith("http://") ? "https://" + u.slice(7) : u);
const httpsThumb = (t) => (t ? { url: toHttps(t.url), alt: t.alt } : null);

function toLight(node) {
  const price = node.pricing?.priceRange?.start?.gross ?? null;
  const original = node.pricing?.priceRangeUndiscounted?.start?.gross ?? null;
  // First Supabase direct URL: cold-start-immune bytes for the grid tile
  // (thumbnail proxy URLs go through the sleeping Render container).
  const firstMedia = node.media?.[0] ?? null;
  return {
    id: node.id,
    slug: node.slug,
    name: node.name,
    price,
    originalPrice: original && price && original.amount > price.amount ? original : null,
    thumbnail: httpsThumb(node.thumbnail),
    imageUrl: firstMedia ? toHttps(firstMedia.url) : null,
    imageAlt: firstMedia?.alt ?? node.thumbnail?.alt ?? null,
    categorySlug: node.category?.slug ?? null,
    categoryName: node.category?.name ?? null,
    mediaCount: node.media?.length ?? 0,
  };
}

function toDetail(node) {
  const media = (node.media ?? []).map((m) => ({ id: m.id, url: toHttps(m.url), alt: m.alt }));
  const images =
    media.length > 0
      ? media
      : node.thumbnail
        ? [{ id: node.id, url: toHttps(node.thumbnail.url), alt: node.thumbnail.alt }]
        : [];
  return {
    id: node.id,
    name: node.name,
    slug: node.slug,
    seoTitle: node.seoTitle ?? null,
    seoDescription: node.seoDescription ?? null,
    description: node.description ?? null,
    descriptionJson: node.descriptionJson ?? null,
    rating: node.rating ?? null,
    isAvailableForPurchase: node.isAvailableForPurchase ?? false,
    availableForPurchase: node.availableForPurchase ?? null,
    pricing: node.pricing ?? null,
    images,
    thumbnail: httpsThumb(node.thumbnail),
    variants: node.variants ?? [],
    attributes: node.attributes ?? [],
    category: node.category ?? null,
  };
}

async function main() {
  console.log(`Exporting catalog snapshot from ${SALEOR_URL} (channel: ${CHANNEL})`);
  const nodes = [];
  let after = null;
  let hasNextPage = true;
  while (hasNextPage) {
    const data = await gqlWithRetry(SNAPSHOT_QUERY, {
      channel: CHANNEL,
      first: 100,
      after,
      sortBy: { field: "NAME", direction: "ASC" },
    });
    const conn = data?.products;
    for (const edge of conn?.edges ?? []) nodes.push(edge.node);
    hasNextPage = conn?.pageInfo?.hasNextPage ?? false;
    after = conn?.pageInfo?.endCursor ?? null;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const generatedAt = new Date().toISOString();
  writeFileSync(
    join(OUT_DIR, "meta.json"),
    JSON.stringify({ generatedAt, count: nodes.length, channel: CHANNEL }, null, 2) + "\n"
  );
  writeFileSync(
    join(OUT_DIR, "catalog.json"),
    JSON.stringify(nodes.map(toLight), null, 1) + "\n"
  );
  for (const node of nodes) {
    const safe = node.slug.replace(/[^a-z0-9-]/gi, "-");
    writeFileSync(join(OUT_DIR, `${safe}.json`), JSON.stringify(toDetail(node)) + "\n");
  }
  console.log(`Done: ${nodes.length} products → ${OUT_DIR} (${generatedAt})`);
}

await main();
