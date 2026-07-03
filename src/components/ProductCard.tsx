"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { productDisplayName } from "@/lib/site-config";

export interface ProductCardProduct {
  id: string;
  name: string;
  slug: string;
  thumbnail?: { url: string; alt?: string } | null;
  media?: { url: string; alt?: string }[];
  variants?: { id: string; media?: { url: string; alt?: string }[] }[];
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

  const [imgIdx, setImgIdx] = useState(0);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (!hovering || images.length <= 1) return;
    const id = setInterval(() => setImgIdx(i => (i + 1) % images.length), 700);
    return () => clearInterval(id);
  }, [hovering, images.length]);

  const currentImg = images[imgIdx] ?? null;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setImgIdx(0); }}
    >
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100 relative">
        {currentImg ? (
          <Image
            src={currentImg.url}
            alt={currentImg.alt ?? product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover object-center"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-200">
            <span className="text-gray-400">No Image</span>
          </div>
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
