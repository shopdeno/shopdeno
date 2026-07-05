"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { ChevronLeft, ChevronRight, X, Check, Loader2, ShoppingCart, Heart, Truck, Clock, Share2, MapPin } from "lucide-react";
import { ProductCard, type ProductCardProduct } from "@/components/ProductCard";
import { productDisplayName } from "@/lib/site-config";

// Client-side color name → hex fallback for DROPDOWN Color attribute
// (Saleor DROPDOWN type stores no hex; value.value is empty)
const COLOR_HEX: Record<string, string> = {
  red: "#dc2626", blue: "#2563eb", green: "#16a34a", black: "#111827",
  white: "#f9fafb", yellow: "#ca8a04", orange: "#ea580c", purple: "#9333ea",
  pink: "#ec4899", brown: "#92400e", gray: "#6b7280", grey: "#6b7280",
  silver: "#9ca3af", gold: "#d97706", navy: "#1e3a8a", teal: "#0d9488",
  maroon: "#9f1239", olive: "#65a30d", cyan: "#0891b2", magenta: "#c026d3",
  lime: "#84cc16", coral: "#f97316", violet: "#7c3aed", indigo: "#4f46e5",
  beige: "#d4b896", cream: "#fef9c3", turquoise: "#14b8a6", burgundy: "#9f1239",
  charcoal: "#374151", "light-blue": "#93c5fd",
};
function swatchColor(value: string | undefined, slug: string, name: string): string {
  if (value) return value; // SWATCH type with hex
  return COLOR_HEX[slug] ?? COLOR_HEX[name.toLowerCase()] ?? "#9ca3af";
}

const md = (s: string) => (s as string).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

function renderEditorJs(raw: string): string {
  try {
    const doc = JSON.parse(raw);
    if (!Array.isArray(doc?.blocks)) return "";
    return doc.blocks.map((block: { type: string; data: Record<string, unknown> }) => {
      switch (block.type) {
        case "paragraph":
          return `<p>${md(block.data.text as string)}</p>`;
        case "header":
          return `<h${block.data.level}>${md(block.data.text as string)}</h${block.data.level}>`;
        case "list": {
          const tag = block.data.style === "ordered" ? "ol" : "ul";
          const items = (block.data.items as string[]).map((i) => `<li>${i}</li>`).join("");
          return `<${tag}>${items}</${tag}>`;
        }
        default:
          return "";
      }
    }).join("");
  } catch {
    return "";
  }
}

function renderEditorJsShort(raw: string): string {
  try {
    const doc = JSON.parse(raw);
    if (!Array.isArray(doc?.blocks) || doc.blocks.length === 0) return "";
    const first = doc.blocks[0];
    return first.type === "paragraph" ? `<p>${md(first.data.text as string)}</p>` : "";
  } catch {
    return "";
  }
}

interface ProductImage {
  id: string;
  url: string;
  alt?: string;
}

interface Attribute {
  attribute: {
    id: string;
    name: string;
    slug: string;
  };
  values: {
    id: string;
    name: string;
    value: string;
    slug: string;
  }[];
}

interface Variant {
  id: string;
  name: string;
  sku: string;
  quantityAvailable?: number;
  media?: { id: string; url: string; alt?: string }[];
  attributes: Attribute[];
  pricing: {
    price: {
      gross: {
        amount: number;
        currency: string;
      };
    };
    priceUndiscounted?: {
      gross: {
        amount: number;
        currency: string;
      };
    };
  };
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  descriptionJson?: string;
  seoDescription?: string;
  seoTitle?: string;
  rating?: number;
  isAvailableForPurchase: boolean;
  pricing: {
    priceRange: {
      start?: {
        gross: {
          amount: number;
          currency: string;
        };
      };
      stop?: {
        gross: {
          amount: number;
          currency: string;
        };
      };
    };
    priceRangeUndiscounted?: {
      start?: {
        gross: {
          amount: number;
          currency: string;
        };
      };
    };
  };
  images: ProductImage[];
  thumbnail?: ProductImage;
  variants: Variant[];
  attributes: Attribute[];
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface ProductDetailClientProps {
  product: Product;
  relatedProducts?: ProductCardProduct[];
}

export function ProductDetailClient({ product, relatedProducts = [] }: ProductDetailClientProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(() => product.variants[0] ?? null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    product.variants[0]?.attributes?.forEach((attr) => {
      if (attr.values?.[0]) initial[attr.attribute.slug] = attr.values[0].slug;
    });
    return initial;
  });
  const [quantity, setQuantity] = useState(1);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "reviews" | "shipping" | "policy">("description");
  const [wishlisted, setWishlisted] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [hoveredThumb, setHoveredThumb] = useState<number | null>(null);
  const { addItem, isLoading } = useCart();

  // Color is a variant attribute — derive unique attrs from all variants + product-level attrs
  const variantAttrMap = new Map<string, { attribute: Attribute["attribute"]; values: Attribute["values"] }>();
  for (const variant of product.variants) {
    for (const attr of variant.attributes || []) {
      if (!variantAttrMap.has(attr.attribute.id)) {
        variantAttrMap.set(attr.attribute.id, { attribute: attr.attribute, values: [] });
      }
      const entry = variantAttrMap.get(attr.attribute.id)!;
      for (const val of attr.values) {
        if (!entry.values.find((v) => v.id === val.id)) {
          entry.values.push(val);
        }
      }
    }
  }
  const allAttributes: Attribute[] = [
    ...(product.attributes || []),
    ...Array.from(variantAttrMap.values()),
  ];
  const WC_THUMB_PATTERN = /-\d+x\d+\.(jpg|jpeg|png|webp|avif)/i;
  const filteredImages = product.images?.filter(img => !WC_THUMB_PATTERN.test(img.url)) ?? [];
  const productImages = filteredImages.length > 0
    ? filteredImages
    : product.images?.length > 0
      ? product.images
      : product.thumbnail ? [product.thumbnail] : [];

  const imageVariantColor = useMemo(() => {
    const map = new Map<string, string>();
    for (const variant of product.variants) {
      const colorAttr = variant.attributes.find(a => a.attribute.slug === "color");
      const val = colorAttr?.values[0];
      if (!val) continue;
      const hex = swatchColor(val.value, val.slug, val.name);
      for (const media of variant.media ?? []) {
        map.set(media.url, hex);
      }
    }
    return map;
  }, [product.variants]);

  const imageVariantAttrs = useMemo(() => {
    const map = new Map<string, Record<string, string>>();
    for (const variant of product.variants) {
      if (!variant.media?.length) continue;
      const attrs: Record<string, string> = {};
      for (const attr of variant.attributes) {
        if (attr.values[0]) attrs[attr.attribute.slug] = attr.values[0].slug;
      }
      for (const media of variant.media) {
        map.set(media.url, attrs);
      }
    }
    return map;
  }, [product.variants]);

  const sortedProductImages = useMemo(() => {
    const seenColors: string[] = [];
    for (const v of product.variants) {
      const slug = v.attributes.find(a => a.attribute.slug === "color")?.values[0]?.slug;
      if (slug && !seenColors.includes(slug)) seenColors.push(slug);
    }
    if (seenColors.length === 0) return productImages;
    const colorOrder = new Map(seenColors.map((slug, i) => [slug, i]));
    return [...productImages].sort((a, b) => {
      const aIdx = colorOrder.get(imageVariantAttrs.get(a.url)?.["color"] ?? "") ?? Infinity;
      const bIdx = colorOrder.get(imageVariantAttrs.get(b.url)?.["color"] ?? "") ?? Infinity;
      return aIdx - bIdx;
    });
  }, [product.variants, productImages, imageVariantAttrs]);

  useEffect(() => {
    const handleScroll = () => setShowStickyBar(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const variant = product.variants.find((v) =>
      v.attributes?.every((attr) => {
        const selectedValue = selectedAttributes[attr.attribute.slug];
        return attr.values?.some((val) => val.slug === selectedValue);
      })
    );
    // Fall back to first variant rather than clearing selection if no attribute match
    setSelectedVariant(variant ?? product.variants[0] ?? null);
  }, [selectedAttributes, product.variants]);

  useEffect(() => {
    setWishlisted(localStorage.getItem(`wishlist_${product.id}`) === "1");
    setShareUrl(window.location.href);
  }, [product.id]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") setSelectedImage((i) => (i - 1 + sortedProductImages.length) % sortedProductImages.length);
      if (e.key === "ArrowRight") setSelectedImage((i) => (i + 1) % sortedProductImages.length);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen, sortedProductImages.length]);

  // Sync main image to selected variant's first media item
  useEffect(() => {
    if (!selectedVariant?.media?.length) return;
    const url = selectedVariant.media[0].url;
    const idx = sortedProductImages.findIndex((img) => img.url === url);
    if (idx !== -1) setSelectedImage(idx);
  }, [selectedVariant]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAttributeChange = (attributeSlug: string, valueSlug: string) => {
    setSelectedAttributes((prev) => ({ ...prev, [attributeSlug]: valueSlug }));
  };

  const formatPrice = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    await addItem(selectedVariant.id, quantity);
  };

  const toggleWishlist = () => {
    const next = !wishlisted;
    setWishlisted(next);
    if (next) {
      localStorage.setItem(`wishlist_${product.id}`, "1");
    } else {
      localStorage.removeItem(`wishlist_${product.id}`);
    }
  };

  const currentPrice = selectedVariant?.pricing?.price?.gross ||
    product.pricing?.priceRange?.start?.gross;
  const currentCurrency = currentPrice?.currency || "USD";
  const currentAmount = currentPrice?.amount || 0;

  const originalPrice = selectedVariant?.pricing?.priceUndiscounted?.gross ||
    product.pricing?.priceRangeUndiscounted?.start?.gross;

  const hasDiscount = originalPrice && originalPrice.amount > currentAmount;
  const discountPercentage = hasDiscount
    ? Math.round((1 - currentAmount / originalPrice.amount) * 100)
    : 0;

  const ratingStars = product.rating != null && product.rating > 0
    ? Math.round(product.rating)
    : null;

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex mb-8">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">Home</Link>
            </li>
            <li><ChevronLeft className="h-4 w-4 text-gray-400" /></li>
            <li>
              <Link href="/products" className="text-sm text-gray-500 hover:text-gray-700">Shop DENO</Link>
            </li>
            <li><ChevronLeft className="h-4 w-4 text-gray-400" /></li>
            {product.category && (
              <>
                <li>
                  <Link href={`/saccos/${product.category.slug}`} className="text-sm text-gray-500 hover:text-gray-700">
                    {product.category.name}
                  </Link>
                </li>
                <li><ChevronLeft className="h-4 w-4 text-gray-400" /></li>
              </>
            )}
            <li><span className="text-sm font-medium text-gray-900">{productDisplayName(product.name)}</span></li>
          </ol>
        </nav>

        <div className="lg:grid lg:grid-cols-2 lg:gap-x-12">
          {/* Image section */}
          <div className="lg:max-w-lg lg:self-start">
            <div
              className="rounded-xl bg-gray-100 shadow-sm cursor-zoom-in overflow-hidden"
              onClick={() => sortedProductImages.length > 0 && setLightboxOpen(true)}
            >
              {sortedProductImages[selectedImage] ? (
                <Image
                  src={sortedProductImages[selectedImage].url}
                  alt={sortedProductImages[selectedImage].alt || product.name}
                  width={0}
                  height={0}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="w-full h-auto"
                  priority
                />
              ) : (
                <div className="flex h-48 items-center justify-center text-gray-400">No Image</div>
              )}
            </div>
            {sortedProductImages.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {sortedProductImages.map((image, idx) => {
                  const isActive = idx === selectedImage;
                  const isHovered = idx === hoveredThumb;
                  const thumbColor = imageVariantColor.get(image.url) ?? "#111827";
                  return (
                    <button
                      key={image.id}
                      onClick={() => {
                        setSelectedImage(idx);
                        const attrs = imageVariantAttrs.get(image.url);
                        if (attrs) setSelectedAttributes(attrs);
                      }}
                      onMouseEnter={() => setHoveredThumb(idx)}
                      onMouseLeave={() => setHoveredThumb(null)}
                      className={`relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                        isActive || isHovered ? "" : "border-transparent opacity-70"
                      }`}
                      style={isActive || isHovered ? { borderColor: thumbColor } : undefined}
                    >
                      <Image src={image.url} alt={image.alt || `${product.name} ${idx + 1}`} fill className="object-cover" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="mt-10 lg:mt-0">
            {/* Category label */}
            {product.category && (
              <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">
                {product.category.name}
              </p>
            )}

            {/* Product name */}
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">{productDisplayName(product.name)}</h1>

            {/* Rating */}
            {ratingStars != null && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex text-yellow-400">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={i <= ratingStars ? "text-yellow-400" : "text-gray-200"}>★</span>
                  ))}
                </div>
                <span className="text-sm text-gray-500">{product.rating!.toFixed(1)}</span>
              </div>
            )}

            {/* Price */}
            <div className="mt-4 flex items-center gap-3">
              <p className="text-3xl font-bold tracking-tight text-gray-900">
                {formatPrice(currentAmount, currentCurrency)}
              </p>
              {hasDiscount && (
                <>
                  <span className="text-lg text-gray-400 line-through">
                    {formatPrice(originalPrice.amount, currentCurrency)}
                  </span>
                  <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    -{discountPercentage}%
                  </span>
                </>
              )}
            </div>

            {/* Short description */}
            <div
              className="mt-4 text-base text-gray-600 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: product.descriptionJson
                  ? renderEditorJsShort(product.descriptionJson)
                  : product.description || ""
              }}
            />

            {/* Attribute selectors */}
            {allAttributes.length > 0 && (
              <div className="mt-6 space-y-5">
                {allAttributes.map((attr) => {
                  const isColor = attr.attribute.slug === "color";
                  return (
                    <div key={attr.attribute.id}>
                      <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        {isColor ? "Color" : attr.attribute.name}
                        {selectedAttributes[attr.attribute.slug] && (
                          <span className="font-normal text-gray-500">
                            : {attr.values.find((v) => v.slug === selectedAttributes[attr.attribute.slug])?.name}
                          </span>
                        )}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {attr.values.map((value) => {
                          const isSelected = selectedAttributes[attr.attribute.slug] === value.slug;
                          if (isColor) {
                            return (
                              <button
                                key={value.id}
                                onClick={() => handleAttributeChange(attr.attribute.slug, value.slug)}
                                style={{ backgroundColor: swatchColor(value.value, value.slug, value.name) }}
                                className={`w-8 h-8 rounded-full border-2 transition-all ${
                                  isSelected
                                    ? "ring-2 ring-offset-2 ring-gray-900 border-transparent"
                                    : "border-gray-300 hover:border-gray-400"
                                }`}
                                title={value.name}
                              />
                            );
                          }
                          return (
                            <button
                              key={value.id}
                              onClick={() => handleAttributeChange(attr.attribute.slug, value.slug)}
                              className={`px-4 py-2 text-sm rounded-full border transition-all ${
                                isSelected
                                  ? "border-gray-900 bg-gray-900 text-white"
                                  : "border-gray-300 bg-white text-gray-900 hover:border-gray-400"
                              }`}
                            >
                              {value.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quantity */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900">Quantity</h3>
              <div className="mt-2 flex items-center border border-gray-300 rounded-lg w-fit overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2.5 hover:bg-gray-50 text-gray-600 text-lg leading-none"
                >
                  −
                </button>
                <span className="w-12 text-center text-sm font-medium border-x border-gray-300 py-2.5">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-4 py-2.5 hover:bg-gray-50 text-gray-600 text-lg leading-none"
                >
                  +
                </button>
              </div>
            </div>

            {/* CTA row */}
            <div className="mt-6 flex gap-3">
              {(() => {
                const isVariantInStock = !selectedVariant || (selectedVariant.quantityAvailable ?? 1) > 0;
                return (
                  <button
                    onClick={handleAddToCart}
                    disabled={!product.isAvailableForPurchase || !selectedVariant || !isVariantInStock || isLoading}
                    className="flex-1 flex items-center justify-center gap-2 rounded-full border border-transparent bg-gray-900 px-8 py-3.5 text-base font-medium text-white hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : !product.isAvailableForPurchase || !isVariantInStock ? (
                      "Out of Stock"
                    ) : !selectedVariant ? (
                      "Select Options"
                    ) : (
                      <><ShoppingCart className="h-5 w-5" /><span>Add to cart</span></>
                    )}
                  </button>
                );
              })()}
              <button
                onClick={toggleWishlist}
                className={`flex items-center justify-center gap-2 rounded-full border px-5 py-3.5 text-sm font-medium transition-colors ${
                  wishlisted
                    ? "border-red-300 bg-red-50 text-red-600"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                <Heart className={`h-5 w-5 ${wishlisted ? "fill-red-500 text-red-500" : ""}`} />
                {wishlisted ? "Saved" : "Wishlist"}
              </button>
            </div>

            {/* Trust signals */}
            <div className="mt-6 space-y-3 border-t border-gray-100 pt-6">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Truck className="h-5 w-5 flex-shrink-0" style={{ color: "#FFCC00" }} />
                <span>
                  <strong className="text-gray-900">DHL</strong> worldwide shipping
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Clock className="h-5 w-5 flex-shrink-0 text-blue-500" />
                <span>
                  <strong className="text-gray-900">Estimated delivery</strong> — 5–10 business days
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <MapPin className="h-5 w-5 flex-shrink-0 text-orange-500" />
                <span>
                  <strong className="text-gray-900">Free collection</strong> — pick up at our Nairobi studio
                </span>
              </div>
              {selectedVariant && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Check className="h-5 w-5 flex-shrink-0 text-green-500" />
                  <span>
                    <strong className="text-gray-900">In stock</strong> — ready to ship
                  </span>
                </div>
              )}
            </div>

            {/* Share */}
            {shareUrl && (
              <div className="mt-6 flex items-center gap-3 flex-wrap">
                <Share2 className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-gray-600">Share this product</span>
                <div className="flex gap-3 flex-wrap">
                  {/* Facebook */}
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors" aria-label="Share on Facebook">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                  </a>
                  {/* X / Twitter */}
                  <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(product.name)}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-900 transition-colors" aria-label="Share on X">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  </a>
                  {/* LinkedIn */}
                  <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-700 transition-colors" aria-label="Share on LinkedIn">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                  </a>
                  {/* Pinterest */}
                  <a href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(product.thumbnail?.url ?? "")}&description=${encodeURIComponent(product.name + " — Nairobi matatu art print by Dennis Muraguri")}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-red-600 transition-colors" aria-label="Pin on Pinterest">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" /></svg>
                  </a>
                  {/* WhatsApp */}
                  <a href={`https://wa.me/?text=${encodeURIComponent(product.name + " " + shareUrl)}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-green-600 transition-colors" aria-label="Share on WhatsApp">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  </a>
                  {/* Instagram — no web share URL; copies link for pasting into stories/bio */}
                  <button
                    onClick={async () => {
                      try {
                        if (navigator.share) {
                          await navigator.share({ title: product.name, url: shareUrl });
                        } else {
                          await navigator.clipboard.writeText(shareUrl);
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 2000);
                        }
                      } catch {}
                    }}
                    className="text-gray-400 hover:text-pink-600 transition-colors"
                    aria-label="Share on Instagram"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                  </button>
                  {/* Snapchat */}
                  <a href={`https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-yellow-400 transition-colors" aria-label="Share on Snapchat">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.719-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.023 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.499-.739-2.436-2.846-2.436-4.629 0-3.769 2.737-7.229 7.892-7.229 4.144 0 7.365 2.953 7.365 6.899 0 4.117-2.595 7.431-6.199 7.431-1.211 0-2.354-.629-2.744-1.373l-.746 2.837c-.271 1.042-1.001 2.347-1.492 3.141.949.293 1.951.448 2.99.448 6.623 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z" /></svg>
                  </a>
                  {/* Email */}
                  <a href={`mailto:?subject=${encodeURIComponent(product.name + " — Dennis Muraguri Art Prints")}&body=${encodeURIComponent("Check out this matatu art print: " + shareUrl)}`} className="text-gray-400 hover:text-gray-700 transition-colors" aria-label="Share via Email">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                  </a>
                  {/* Copy link */}
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(shareUrl);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                    className="text-gray-400 hover:text-gray-700 transition-colors"
                    aria-label="Copy link"
                  >
                    {linkCopied
                      ? <Check className="h-5 w-5 text-green-500" />
                      : <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                    }
                  </button>
                </div>
                {linkCopied && <span className="text-xs text-green-600 font-medium">Link copied!</span>}
              </div>
            )}
          </div>
        </div>

        {/* Product info tabs */}
        <div className="mt-12 border-t border-gray-200 pt-8">
          <div className="flex gap-2 flex-wrap">
            {(
              [
                { id: "description", label: "Description" },
                { id: "reviews",     label: "Customer Reviews" },
                { id: "shipping",    label: "Shipping & Returns" },
                { id: "policy",      label: "Return Policy" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2 rounded-full text-sm font-medium border transition-colors ${
                  activeTab === tab.id
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 p-6 text-sm text-gray-600 leading-relaxed">
            {activeTab === "description" && (
              product.descriptionJson ? (
                <div
                  className="space-y-3 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
                  dangerouslySetInnerHTML={{ __html: renderEditorJs(product.descriptionJson) }}
                />
              ) : (
                <p className="text-gray-500">No description available.</p>
              )
            )}

            {activeTab === "reviews" && (() => {
              // ponytail: reviews hardcoded empty — wire to a reviews API when available
              const reviews: { id: string; author: string; rating: number; date: string; body: string }[] = [];
              const avg = product.rating ?? 0;
              const count = reviews.length;
              const starCounts = [5, 4, 3, 2, 1].map((n) => ({
                star: n,
                count: reviews.filter((r) => Math.round(r.rating) === n).length,
              }));
              return (
                <>
                  <div className="flex items-start gap-6 mb-6">
                    {/* Aggregate */}
                    <div className="text-center min-w-[80px]">
                      <div className="text-4xl font-bold text-gray-900">{avg > 0 ? avg.toFixed(1) : "—"}</div>
                      <div className="flex justify-center gap-0.5 mt-1">
                        {[1,2,3,4,5].map((i) => (
                          <span key={i} className={avg >= i ? "text-yellow-400" : avg >= i - 0.5 ? "text-yellow-300" : "text-gray-200"}>★</span>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">({count} Ratings)</div>
                    </div>

                    {/* Bar breakdown */}
                    <div className="flex-1 space-y-1.5 border-x border-gray-200 px-6">
                      {starCounts.map(({ star, count: c }) => (
                        <div key={star} className="flex items-center gap-2 text-xs">
                          <span className="text-yellow-400">★</span>
                          <span className="w-2 text-gray-600">{star}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gray-900 rounded-full"
                              style={{ width: count > 0 ? `${(c / count) * 100}%` : "0%" }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="flex-shrink-0">
                      <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors">
                        Write a Review
                      </button>
                    </div>
                  </div>

                  {reviews.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {reviews.map((review) => (
                        <div key={review.id} className="py-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 flex-shrink-0">
                                {review.author[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="flex gap-0.5 mb-0.5">
                                  {[1,2,3,4,5].map((i) => (
                                    <span key={i} className={review.rating >= i ? "text-yellow-400 text-sm" : "text-gray-200 text-sm"}>★</span>
                                  ))}
                                </div>
                                <span className="text-sm font-medium text-gray-900">{review.author}</span>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0">{review.date}</span>
                          </div>
                          <p className="mt-3 text-sm text-gray-600 leading-relaxed">{review.body}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm border-t border-gray-100 pt-6">No reviews yet. Be the first to review this product.</p>
                  )}
                </>
              );
            })()}

            {activeTab === "shipping" && (
              <>
                <h3 className="font-semibold text-gray-900 mb-3">Shipping Information</h3>
                <ul className="list-disc pl-5 space-y-1 mb-6">
                  <li><strong>Processing Time:</strong> Orders are processed within 1–2 business days.</li>
                  <li><strong>Delivery Time:</strong> Standard shipping takes 5–10 business days.</li>
                  <li><strong>Packaging:</strong> Prints ship rolled in a sturdy protective tube.</li>
                  <li><strong>Tracking:</strong> A tracking number is emailed once your order ships.</li>
                </ul>
                <h3 className="font-semibold text-gray-900 mb-3">Return & Exchange Policy</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Eligibility:</strong> Returns accepted within 14 days of delivery for damaged or incorrect items.</li>
                  <li><strong>Refund Process:</strong> Refunds processed within 5–7 business days of receiving the return.</li>
                  <li><strong>Exchange:</strong> Defective or incorrect prints replaced at no extra cost.</li>
                  <li><strong>Return Shipping:</strong> Customers cover return shipping unless the item is defective or incorrect.</li>
                </ul>
              </>
            )}

            {activeTab === "policy" && (
              <>
                <h3 className="font-semibold text-gray-900 mb-3">Return Policy</h3>
                <p className="mb-3">We want you to love your print. If something arrives damaged or incorrect, contact us within 14 days and we will make it right.</p>
                <p>Prints are made to order — we do not accept returns for change of mind. Defective items are replaced at no cost. All sales of digital files are final.</p>
              </>
            )}
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-16 border-t border-gray-200 pt-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">You may also like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && sortedProductImages.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Counter */}
          <span className="absolute top-4 left-4 text-white text-sm font-medium select-none">
            {selectedImage + 1} / {sortedProductImages.length}
          </span>

          {/* Close */}
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
          >
            <X className="h-7 w-7" />
          </button>

          {/* Prev */}
          {sortedProductImages.length > 1 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors bg-black/40 rounded-full p-2"
              onClick={(e) => { e.stopPropagation(); setSelectedImage((i) => (i - 1 + sortedProductImages.length) % sortedProductImages.length); }}
              aria-label="Previous"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
          )}

          {/* Main image */}
          <div
            className="relative w-full max-w-3xl max-h-[75vh] aspect-square mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={sortedProductImages[selectedImage].url}
              alt={sortedProductImages[selectedImage].alt || product.name}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>

          {/* Next */}
          {sortedProductImages.length > 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors bg-black/40 rounded-full p-2"
              onClick={(e) => { e.stopPropagation(); setSelectedImage((i) => (i + 1) % sortedProductImages.length); }}
              aria-label="Next"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          )}

          {/* Thumbnail strip */}
          {sortedProductImages.length > 1 && (
            <div
              className="absolute bottom-4 flex gap-2 overflow-x-auto max-w-full px-4"
              onClick={(e) => e.stopPropagation()}
            >
              {sortedProductImages.map((image, idx) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImage(idx)}
                  className={`relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                    idx === selectedImage ? "border-white" : "border-transparent opacity-50 hover:opacity-80"
                  }`}
                >
                  <Image src={image.url} alt={image.alt || `${product.name} ${idx + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sticky bar */}
      {showStickyBar && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              {sortedProductImages[0] && (
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md">
                  <Image src={sortedProductImages[0].url} alt={product.name} fill className="object-cover" />
                </div>
              )}
              <div>
                <h4 className="font-medium text-gray-900">{productDisplayName(product.name)}</h4>
                <p className="text-gray-700 font-semibold">{formatPrice(currentAmount, currentCurrency)}</p>
              </div>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!product.isAvailableForPurchase || !selectedVariant || (selectedVariant.quantityAvailable ?? 1) === 0 || isLoading}
              className="rounded-full bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:bg-gray-300 transition-colors"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Add to Cart"}
            </button>
          </div>
        </div>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.seoDescription || product.description,
            image: sortedProductImages.map((img) => img.url),
            sku: selectedVariant?.sku || product.variants[0]?.sku,
            offers: {
              "@type": "Offer",
              price: currentAmount,
              priceCurrency: currentCurrency,
              availability: product.isAvailableForPurchase
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            },
            brand: { "@type": "Brand", name: "Dennis Muraguri" },
          }),
        }}
      />
    </div>
  );
}
