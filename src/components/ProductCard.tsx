"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { productDisplayName } from "@/lib/site-config";
import { getBlurDataURL } from "@/lib/imageUtils";

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

export function ProductCard({ product }: { product: ProductCardProduct }) {
  const price = product.pricing?.priceRange?.start?.gross;
  const originalPrice = product.pricing?.priceRangeUndiscounted?.start?.gross;
  const hasDiscount = originalPrice && price && originalPrice.amount > price.amount;

  const images = useMemo(() => {
    const variantImgs = (product.variants ?? [])
      .flatMap(v => v.media ?? [])
      .filter((img, i, arr) => arr.findIndex(x => x.url === img.url) === i);
    if (variantImgs.length) return variantImgs;
    if (product.media?.length) return product.media;
    return product.thumbnail ? [product.thumbnail] : [];
  }, [product.variants, product.media, product.thumbnail]);

  // Determine if we have a generated GIF for this product (multiple images)
  const hasMultipleImages =
    (images ?? []).length > 1;
  const gifSrc = hasMultipleImages ? `/product-gifs/${product.id}.gif` : null;

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
            priority
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