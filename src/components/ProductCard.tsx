import Image from "next/image";
import Link from "next/link";

export interface ProductCardProduct {
  id: string;
  name: string;
  slug: string;
  thumbnail?: { url: string; alt?: string } | null;
  media?: { url: string; alt?: string }[];
  pricing?: {
    priceRange?: { start?: { gross: { amount: number; currency: string } } | null } | null;
    priceRangeUndiscounted?: { start?: { gross: { amount: number; currency: string } } | null } | null;
  } | null;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

// Presentational product tile shared by the home, PLP, search and collection
// grids. Purely visual — no data fetching or routing state.
export function ProductCard({ product }: { product: ProductCardProduct }) {
  const price = product.pricing?.priceRange?.start?.gross;
  const originalPrice = product.pricing?.priceRangeUndiscounted?.start?.gross;
  const hasDiscount = originalPrice && price && originalPrice.amount > price.amount;
  const imgUrl = product.thumbnail?.url ?? product.media?.[0]?.url;
  const imgAlt = product.thumbnail?.alt ?? product.media?.[0]?.alt ?? product.name;

  return (
    <Link href={`/products/${product.slug}`} className="group">
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100 relative">
        {imgUrl ? (
          <Image
            src={imgUrl}
            alt={imgAlt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover object-center group-hover:opacity-75 transition-opacity"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-200">
            <span className="text-gray-400">No Image</span>
          </div>
        )}
      </div>
      <h3 className="mt-4 text-sm font-medium text-gray-700">{product.name}</h3>
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
