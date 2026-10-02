"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { productDisplayName } from "@/lib/site-config";
import { getBlurDataURL, sizedImageUrl } from "@/lib/imageUtils";
import { PRODUCT_GIF_IDS } from "@/lib/product-gifs-manifest";

export interface ProductCardProduct {
  id: string;
  name: string;
  slug: string;
  thumbnail?: { url: string; alt?: string } | null;
  media?: { url: string; alt?: string }[] | null;
  variants?: { id: string; media?: { url: string; alt?: string }[] | null }[] | null;
  pricing?: {
    priceRange?: { start?: { gross: { amount: number; currency: string } } | null } | null;
    priceRangeUndiscounted?: { start?: { gross: { amount: number; currency: string } } | null } | null;
  } | null;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductCardProduct;
  /** Set for above-the-fold tiles only — eager-loads the image (LCP). */
  priority?: boolean;
}) {
  const price = product.pricing?.priceRange?.start?.gross;
  const originalPrice = product.pricing?.priceRangeUndiscounted?.start?.gross;
  const hasDiscount = originalPrice && price && originalPrice.amount > price.amount;

  // Grid tiles show ONE image: prefer the sized thumbnail (512px) over full
  // originals. Saleor `media.url` / variant media are unsized originals
  // (up to 4096px in this catalog) — resized via Supabase transforms when
  // they are Supabase direct URLs, so tiles stay ~30KB and cold-start-immune.
  const images = useMemo(() => {
    const seen = new Set<string>();
    const out: { url: string; alt?: string }[] = [];
    const push = (img?: { url: string; alt?: string } | null) => {
      if (!img?.url || seen.has(img.url)) return;
      seen.add(img.url);
      out.push({ url: sizedImageUrl(img.url, 512), alt: img.alt });
    };
    push(product.thumbnail);
    for (const img of product.media ?? []) push(img);
    for (const v of product.variants ?? []) for (const img of v.media ?? []) push(img);
    return out;
  }, [product.variants, product.media, product.thumbnail]);

  // Determine if we have a generated GIF for this product (multiple images)
  const hasMultipleImages =
    (images ?? []).length > 1;
  // Only reference a GIF that was actually generated (see product-gifs-manifest),
  // otherwise the always-mounted hover <Image> 404s for GIF-less products.
  const gifSrc =
    hasMultipleImages && PRODUCT_GIF_IDS.has(product.id)
      ? `/product-gifs/${product.id}.gif`
      : null;

  const [showHover, setShowHover] = useState(false);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group"
      onMouseEnter={() => setShowHover(true)}
      onMouseLeave={() => setShowHover(false)}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
        {/* Default image (first image/thumbnail) */}
        {images?.[0] ? (
          <Image
            src={images[0].url}
            alt={images[0].alt ?? product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover object-center"
            priority={priority}
            loading={priority ? undefined : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            placeholder="blur"
            blurDataURL={getBlurDataURL()}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-200">
            <span className="text-gray-400">No Image</span>
          </div>
        )}
        {/* Hover GIF (if available) — always in DOM so browser preloads it;
            CSS opacity toggled on hover to avoid conditional mount/unmount
            which causes React "Node cannot be found" errors. */}
        {gifSrc && (
          <Image
            src={gifSrc}
            alt={`${product.name} variations`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover object-center absolute inset-0 transition-opacity duration-200 ${showHover ? "opacity-100" : "opacity-0"}`}
            unoptimized
            loading="lazy"
          />
        )}
      </div>
      <h3 className="mt-4 text-sm font-medium text-gray-700">{productDisplayName(product.name)}</h3>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-sm font-medium text-gray-900">
          {price ? formatPrice(price.amount, price.currency) : "N/A"}
        </p>
        {hasDiscount && (
          <p className="text-sm text-gray-500 line-through">
            {formatPrice(originalPrice.amount, originalPrice.currency)}
          </p>
        )}
      </div>
    </Link>
  );
}