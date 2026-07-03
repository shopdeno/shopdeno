"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";

interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  backgroundImage?: {
    url: string;
    alt?: string;
  };
}

interface Product {
  id: string;
  name: string;
  slug: string;
  thumbnail?: { url: string; alt?: string };
  media?: { url: string; alt?: string }[];
  variants?: { id: string; media?: { url: string; alt?: string }[] }[];
  pricing: {
    priceRange: { start?: { gross: { amount: number; currency: string } } };
    priceRangeUndiscounted?: { start?: { gross: { amount: number; currency: string } } };
  };
}

interface PageInfo {
  hasNextPage: boolean;
  endCursor?: string;
}

interface ProductGridProps {
  collection: Collection;
  products: { node: Product }[];
  pageInfo?: PageInfo;
  currentPage: number;
  currentSort?: string;
}

const SORT_OPTIONS = [
  { value: "NAME", label: "Name" },
  { value: "NAME_DESC", label: "Name (Z-A)" },
  { value: "PRICE", label: "Price (Low to High)" },
  { value: "PRICE_DESC", label: "Price (High to Low)" },
  { value: "DATE", label: "Newest" },
  { value: "DATE_DESC", label: "Oldest" },
];

export function ProductGrid({
  collection,
  products,
  pageInfo,
  currentPage,
  currentSort,
}: ProductGridProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", e.target.value);
    params.delete("page");
    router.push(`/collections/${collection.slug}?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/collections/${collection.slug}?${params.toString()}`);
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-white">
      {collection.backgroundImage && (
        <div className="relative h-64 w-full md:h-80">
          <Image
            src={collection.backgroundImage.url}
            alt={collection.backgroundImage.alt || collection.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-4xl font-bold text-white">{collection.name}</h1>
          </div>
        </div>
      )}

      {!collection.backgroundImage && (
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="mt-2 text-lg text-gray-500">{collection.description}</p>
          )}
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex items-center justify-between py-6">
          <p className="text-sm text-gray-500">
            {products.length} product{(products.length !== 1) ? "s" : ""}
          </p>
          <select
            value={currentSort || "NAME"}
            onChange={handleSortChange}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Sort by: {option.label}
              </option>
            ))}
          </select>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found in this collection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:gap-x-8">
            {products.map(({ node: product }) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {pageInfo && (pageInfo.hasNextPage || currentPage > 1) && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="px-4 py-2 text-sm text-gray-700">
              Page {currentPage}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pageInfo.hasNextPage}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
