"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { getSaleorClient, getChannel } from "@/lib/saleor";
import { PRODUCTS_QUERY } from "@/graphql/queries";
import { siteConfig, FEATURED_SLUGS, productDisplayName } from "@/lib/site-config";
import { VideoModal } from "@/components/VideoModal";

// Static metadata must live in a separate layout or route segment when using
// "use client". Homepage metadata is set in layout.tsx via siteConfig.

function ProductStripe({
  products,
  offset,
  heading,
  linkText = "View all prints →",
}: {
  products: any[];
  offset: number;
  heading: string;
  linkText?: string;
}) {
  const len = Math.max(products.length, 1);
  const start = offset % len;
  const rotated = products.length > 0
    ? [...products.slice(start), ...products.slice(0, start)]
    : [];

  return (
    <section className="py-12 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">
            {heading}
          </h2>
          <Link
            href="/products"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 whitespace-nowrap"
          >
            {linkText}
          </Link>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {rotated.length === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex-none w-56 snap-start">
                  <div className="aspect-square w-full rounded-lg bg-gray-200 animate-pulse" />
                  <div className="mt-3 h-4 w-3/4 rounded bg-gray-200 animate-pulse" />
                  <div className="mt-2 h-4 w-1/3 rounded bg-gray-200 animate-pulse" />
                </div>
              ))
            : rotated.map(({ node: product }: any) => {
                const price = product.pricing?.priceRange?.start?.gross;
                return (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug}`}
                    className="group flex-none w-56 snap-start"
                  >
                    <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100 relative">
                      {product.thumbnail ? (
                        <Image
                          src={product.thumbnail.url}
                          alt={product.thumbnail.alt || product.name}
                          fill
                          className="object-cover group-hover:opacity-75 transition-opacity"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gray-200">
                          <span className="text-gray-400 text-xs">No Image</span>
                        </div>
                      )}
                    </div>
                    <h3 className="mt-3 text-sm font-medium text-gray-700">{productDisplayName(product.name)}</h3>
                    {price && (
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: price.currency,
                        }).format(price.amount)}
                      </p>
                    )}
                  </Link>
                );
              })}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [vimeoOpen, setVimeoOpen] = useState(false);
  const [bbcOpen, setBbcOpen] = useState(false);
  const [portraitIndex, setPortraitIndex] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [featuredCarouselIndex, setFeaturedCarouselIndex] = useState(2);
  const CAROUSEL_VISIBLE = 2;

  useEffect(() => {
    const client = getSaleorClient();
    const channel = getChannel();
    (async () => {
      try {
        const result: any = await client.query(PRODUCTS_QUERY, {
          channel,
          first: 100,
          sortBy: { field: "PUBLICATION_DATE", direction: "DESC" },
        });
        setProducts(result.data?.products?.edges || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    if (products.length === 0) return;
    const id = setInterval(() => {
      setPortraitIndex((i) => (i + 1) % products.length);
    }, 1000);
    return () => clearInterval(id);
  }, [products.length]);

  const featuredProducts = products.filter(({ node }: any) => FEATURED_SLUGS.has(node.slug));
  const bebaProducts = products.filter(({ node }: any) => node.category?.slug?.includes("beba"));
  const nonFeaturedNonBeba = products.filter(
    ({ node }: any) => !FEATURED_SLUGS.has(node.slug) && !node.category?.slug?.includes("beba")
  );

  return (
    <div>
      {/* ── Section 1: Hero ── */}
      <section className="relative bg-gray-900 overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <Image
            src="/dennismuraguri-wepresent1.avif"
            alt="Dennis Muraguri matatu art"
            fill
            className="object-cover object-center"
            priority
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-300 mb-4">
            Bring Nairobi&apos;s Vibrant Street Culture to Your Walls
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl max-w-3xl">
            Matatu Art Prints<br />by Dennis Muraguri
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-gray-300">
            High-quality reproductions of Muraguri&apos;s iconic and colourful original woodblock
            reduction prints of Kenya&apos;s vibrant Matatu and street art culture
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/products"
              className="inline-block transition-opacity hover:opacity-85"
              aria-label="Shop Matatu Prints"
            >
              <svg viewBox="0 0 320 68" width="320" height="68" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="320" height="68" rx="6" ry="6" fill="#1c3fa0"/>
                <rect x="4" y="4" width="312" height="60" rx="4" ry="4" fill="none" stroke="white" strokeWidth="2.5"/>
                <text x="20" y="40" fill="white" fontSize="18" fontWeight="bold" fontFamily="Arial, sans-serif" letterSpacing="1.5">SHOP MATATU PRINTS</text>
                <line x1="262" y1="12" x2="262" y2="56" stroke="white" strokeWidth="2"/>
                {/* cart centred in right panel 262–316 = 54px wide; icon ~28px wide → offset 13px */}
                <g transform="translate(275, 14)" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
                  <path d="M0,0 L3,0 L7,20 L25,20 L28,7 L7,7"/>
                  <circle cx="11" cy="27" r="3" fill="white" stroke="none"/>
                  <circle cx="23" cy="27" r="3" fill="white" stroke="none"/>
                </g>
              </svg>
            </Link>
            <Link
              href="#about-artist"
              className="inline-block transition-opacity hover:opacity-80"
              aria-label="About Deno"
            >
              <svg viewBox="0 0 260 68" width="260" height="68" xmlns="http://www.w3.org/2000/svg">
                <path d="M6,0 L218,0 L260,34 L218,68 L6,68 A6,6 0 0,1 0,62 L0,6 A6,6 0 0,1 6,0 Z" fill="#2e6b3e"/>
                <path d="M11,6 L214,6 L251,34 L214,62 L11,62 A4,4 0 0,1 7,58 L7,10 A4,4 0 0,1 11,6 Z" fill="none" stroke="white" strokeWidth="2.5"/>
                <text x="18" y="40" fill="white" fontSize="17" fontWeight="bold" fontFamily="Arial, sans-serif" letterSpacing="1">ABOUT DENO</text>
                <text x="148" y="40" fill="#f5c518" fontSize="20" fontWeight="bold" fontFamily="Arial, sans-serif">A1</text>
                <polyline points="204,20 222,34 204,48" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-4">
            <span className="text-sm text-gray-400">As featured in</span>
            <Image
              src="/wepresent-white.svg"
              alt="WeTransfer's WePresent"
              width={120}
              height={24}
              className="h-6 w-auto"
            />
            <span className="text-gray-500">&amp;</span>
            <Image
              src="/bbc-white.svg"
              alt="BBC"
              width={60}
              height={24}
              className="h-6 w-auto"
            />
          </div>
        </div>
      </section>

      {/* ── Product Stripe 1 — featured products only ── */}
      <ProductStripe
        products={featuredProducts}
        offset={0}
        heading="New to the Collection"
        linkText="Shop all prints →"
      />

      {/* ── Section 2: Matatus Are a Way of Life ── */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-3">
              Art That Moves You: Explore the Dynamic World of Matatus
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              MATATUS ARE A WAY OF LIFE
            </h2>
            <p className="mt-6 text-lg text-gray-600">
              Inspired by the matatus that traverse Nairobi&apos;s streets, Dennis Muraguri&apos;s
              custom art prints are homages to these pulsing dynamic embodiments of Kenyan
              contemporary culture.
            </p>
            <Link
              href="/products"
              className="inline-block mt-6 text-indigo-600 font-medium underline underline-offset-4 hover:text-indigo-500"
            >
              Explore art prints collection.
            </Link>
          </div>
          <div className="relative aspect-video rounded-xl overflow-hidden">
            <Image
              src="/matatus-way-of-life.avif"
              alt="Matatus on Nairobi streets"
              fill
              className="object-cover"
            />
          </div>
        </div>
        </div>
      </section>

      {/* ── Product Stripe 2 ── */}
      <ProductStripe
        products={nonFeaturedNonBeba}
        offset={4}
        heading="Bring Nairobi's Streets to Your Walls"
        linkText="Browse the collection →"
      />

      {/* ── Section 4: About the Artist ── */}
      <section id="about-artist" className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">About the Artist</h2>
            <p className="mt-6 text-lg text-gray-600">
              Dennis Muraguri, born in 1980 in Naivasha is a multimedia artist, now based in
              Nairobi, working in painting, printmaking and sculpture. Muraguri graduated from Buru
              Buru Institute of Fine Arts with a diploma in Painting and Art History. He has been a
              resident artist at Kuona Trust Art Centre since 2005.
            </p>
            <p className="mt-4 text-lg text-gray-600">
              Muraguri is recognised for his work inspired by &lsquo;matatu&rsquo; (Kenyan minibuses
              and vans that are the main mode of public transport). In these works, he employs a
              range of approaches to look at the urban culture of contemporary Nairobi. In his
              sculptures, Muraguri works with recycled wood and metal to create a representation of
              industrialisation in Kenya.
            </p>
            <Link
              href="/products"
              className="inline-block mt-6 text-indigo-600 font-medium underline underline-offset-4 hover:text-indigo-500"
            >
              Explore art prints collection.
            </Link>

            {/* Mini product carousel — Beba prints only */}
            {bebaProducts.length > 0 && (
              <div className="mt-8">
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: CAROUSEL_VISIBLE }).map((_, i) => {
                    const item = bebaProducts[(carouselIndex + i) % bebaProducts.length]?.node;
                    if (!item) return null;
                    const price = item.pricing?.priceRange?.start?.gross;
                    const imgUrl = item.media?.[0]?.url ?? item.thumbnail?.url;
                    return (
                      <Link key={item.id} href={`/products/${item.slug}`} className="group">
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                          {imgUrl && (
                            <Image
                              src={imgUrl}
                              alt={item.name}
                              fill
                              className="object-cover group-hover:opacity-80 transition-opacity"
                            />
                          )}
                        </div>
                        <p className="mt-2 text-sm font-medium text-gray-800 leading-tight line-clamp-2">{productDisplayName(item.name)}</p>
                        {price && (
                          <p className="text-sm text-indigo-600 font-semibold mt-0.5">
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency }).format(price.amount)}
                          </p>
                        )}
                      </Link>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => setCarouselIndex((i) => (i - 1 + bebaProducts.length) % bebaProducts.length)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-colors"
                    aria-label="Previous print"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button
                    onClick={() => setCarouselIndex((i) => (i + 1) % bebaProducts.length)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-colors"
                    aria-label="Next print"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                  <span className="text-xs text-gray-400">{carouselIndex + 1} / {bebaProducts.length}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-6">
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden">
              {(products[portraitIndex]?.node?.media?.[0]?.url || products[portraitIndex]?.node?.thumbnail?.url) && (
                <Image
                  key={portraitIndex}
                  src={products[portraitIndex].node.media?.[0]?.url ?? products[portraitIndex].node.thumbnail.url}
                  alt=""
                  fill
                  className="object-cover transition-opacity duration-500 z-0"
                />
              )}
              <Image
                src="/dennis-muraguri.webp"
                alt="Dennis Muraguri"
                fill
                className="object-cover object-top z-10"
              />
            </div>
            <div className="flex items-center justify-between gap-3 w-full">
              <p
                className="flex-1 whitespace-nowrap text-gray-600"
                style={{ fontSize: "clamp(0.6rem, 1.4vw, 0.875rem)" }}
              >
                All art prints are high quality reproductions signed by Dennis
              </p>
              <Image
                src="/signature.avif"
                alt="Dennis Muraguri signature"
                width={80}
                height={40}
                className="flex-none brightness-0"
              />
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* ── Product Stripe 3 ── */}
      <ProductStripe
        products={nonFeaturedNonBeba}
        offset={8}
        heading="Own a Piece Signed by the Artist"
        linkText="Find your print →"
      />

      {/* ── Section 5: Featured Products ── */}
      <section className="bg-gray-900 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left: vertical video + carousel */}
            <div className="flex flex-col gap-6">
              <div className="relative aspect-[9/16] lg:aspect-[3/4] rounded-xl overflow-hidden">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                  src="/matatu-video.mp4"
                />
              </div>
              {products.length > 0 && (
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: CAROUSEL_VISIBLE }).map((_, i) => {
                      const item = products[(featuredCarouselIndex + i) % products.length]?.node;
                      if (!item) return null;
                      const price = item.pricing?.priceRange?.start?.gross;
                      const imgUrl = item.media?.[0]?.url ?? item.thumbnail?.url;
                      return (
                        <Link key={item.id} href={`/products/${item.slug}`} className="group">
                          <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-800">
                            {imgUrl && (
                              <Image
                                src={imgUrl}
                                alt={item.name}
                                fill
                                className="object-cover group-hover:opacity-80 transition-opacity"
                              />
                            )}
                          </div>
                          <p className="mt-2 text-sm font-medium text-white leading-tight line-clamp-2">{productDisplayName(item.name)}</p>
                          {price && (
                            <p className="text-sm text-indigo-400 font-semibold mt-0.5">
                              {new Intl.NumberFormat("en-US", { style: "currency", currency: price.currency }).format(price.amount)}
                            </p>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      onClick={() => setFeaturedCarouselIndex((i) => (i - 1 + products.length) % products.length)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-600 hover:border-white hover:bg-white hover:text-gray-900 text-white transition-colors"
                      aria-label="Previous print"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button
                      onClick={() => setFeaturedCarouselIndex((i) => (i + 1) % products.length)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-600 hover:border-white hover:bg-white hover:text-gray-900 text-white transition-colors"
                      aria-label="Next print"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <span className="text-xs text-gray-500">{featuredCarouselIndex + 1} / {products.length}</span>
                  </div>
                </div>
              )}
            </div>
            {/* Right: heading + stacked prints */}
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">
                  Featured Prints
                </p>
                <h2 className="text-3xl font-bold text-white">From the Collection</h2>
              </div>
              <Link href="/products/matatu-for-president-kacose-sacco" className="group">
                <div className="relative w-full rounded-xl overflow-hidden bg-gray-800">
                  <Image
                    src="/matatu-for-president.avif"
                    alt="Matatu for President matatu art print by Dennis Muraguri"
                    width={800}
                    height={600}
                    className="w-full h-auto group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h3 className="mt-4 text-xl font-bold text-white uppercase">Matatu 4 President</h3>
                <p className="text-gray-400 text-sm">Manyaga, Music, Mischief &amp; Mayhem.</p>
              </Link>
              <Link href="/products/ecko-unltd-ongata-line-transporters" className="group">
                <div className="relative w-full rounded-xl overflow-hidden bg-gray-800">
                  <Image
                    src="/ecko-unltd.avif"
                    alt="Eckō Unltd matatu art print by Dennis Muraguri"
                    width={800}
                    height={600}
                    className="w-full h-auto group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h3 className="mt-4 text-xl font-bold text-white uppercase">Eckō Unltd.</h3>
                <p className="text-gray-400 text-sm">Ongata Line Transporters</p>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Product Stripe 4 ── */}
      <ProductStripe
        products={nonFeaturedNonBeba}
        offset={2}
        heading="Start Your Collection Today"
        linkText="See every print →"
      />

      {/* ── Section 6: Montague Contemporary ── */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0">
          <Image
            src="/dennis-muraguri-in-his-nairobi-studio-kuona-arts-trust.webp"
            alt=""
            fill
            className="object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-black/35" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <Image
            src="/montague-contemporary-logo.avif"
            alt="Montague Contemporary"
            width={300}
            height={90}
            className="mx-auto mb-6"
          />
          <h2 className="text-2xl font-bold text-white">
            Montague Contemporary<br />presents<br />Dennis Muraguri
          </h2>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-200">
            Discover the world that inspires Dennis Muraguri and delve into his creative process with
            a glimpse inside his Nairobi studio. Experience how he weaves together textual and visual
            elements from music, graffiti, television, and film to capture a unique contemporary urban
            culture in Kenya.
          </p>
          <div className="relative inline-flex mt-8">
            <span className="absolute inset-0 rounded-full animate-ping bg-gray-900 opacity-30" />
            <button
              onClick={() => setVimeoOpen(true)}
              className="relative inline-flex items-center gap-2 rounded-full bg-gray-900 px-8 py-3 text-white font-medium hover:bg-gray-700"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch Film
            </button>
          </div>
          <VideoModal
            src="https://player.vimeo.com/video/463907902?autoplay=1"
            isOpen={vimeoOpen}
            onClose={() => setVimeoOpen(false)}
            title="Montague Contemporary presents Dennis Muraguri"
          />
        </div>
      </section>

      {/* ── Product Stripe 5 ── */}
      <ProductStripe
        products={nonFeaturedNonBeba}
        offset={6}
        heading="Gallery-Quality Prints for Your Home"
        linkText="Shop the range →"
      />

      {/* ── Section 7: Matatu Games ── */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative aspect-video rounded-xl overflow-hidden">
              <video
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
                src="/matatu-games.webm"
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">Matatu Games</h2>
              <p className="mt-6 text-lg text-gray-600">
                Muraguri&apos;s woodcut prints reference both Nairobi&apos;s urban culture and
                international popular culture using graffiti, music and politics depicted on these
                real life matatus.
              </p>
              <blockquote className="mt-8 border-l-4 border-gray-300 pl-4">
                <p className="text-gray-700 italic">
                  &ldquo;To talk about Kenyan artist Dennis Muraguri&apos;s work is to learn about
                  matatus.&rdquo;
                </p>
                <footer className="mt-4 flex items-center gap-3">
                  <Image
                    src="/alix-rose-cowie.avif"
                    alt="Alix-Rose Cowie"
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Alix-Rose Cowie</p>
                    <p className="text-xs text-gray-500">Writer — WeTransfer&apos;s WePresent</p>
                  </div>
                </footer>
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* ── Product Stripe 6 ── */}
      <ProductStripe
        products={nonFeaturedNonBeba}
        offset={10}
        heading="Prints That Tell Nairobi's Story"
        linkText="Explore all designs →"
      />

      {/* ── Section 8: WePresent Feature ── */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <Image
            src="/wepresent-interview.avif"
            alt="Dennis Muraguri featured on WePresent"
            width={0}
            height={0}
            sizes="100vw"
            className="w-full h-auto rounded-xl"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">As featured in</p>
            <Image
              src="/wepresent-white.svg"
              alt="WeTransfer's WePresent"
              width={220}
              height={44}
              className="h-11 w-auto mb-4 brightness-0"
            />
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Interview with writer Alix-Rose Cowie
            </h2>
            <a
              href="https://wepresent.wetransfer.com/stories/dennis-muraguri-woodcut-matatu-prints"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-6 text-indigo-600 font-medium underline underline-offset-4 hover:text-indigo-500"
            >
              To WePresent&apos;s interview…
            </a>
          </div>
        </div>
        </div>
      </section>

      {/* ── Product Stripe 7 ── */}
      <ProductStripe
        products={nonFeaturedNonBeba}
        offset={1}
        heading="Join Collectors Around the World"
        linkText="Order yours today →"
      />

      {/* ── Section 9: BBC Feature ── */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">As featured in</p>
              <Image
                src="/bbc-white.svg"
                alt="BBC"
                width={80}
                height={28}
                className="h-7 w-auto mb-4 brightness-0"
              />
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                Collaboration with Kenyan Luxury Fashion Designer Zuri
              </h2>
              <a
                href="https://www.bbc.com/news/av/business-50039382"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-6 text-indigo-600 font-medium underline underline-offset-4 hover:text-indigo-500"
              >
                To the BEEB feature…
              </a>
            </div>
            {/* BBC video card — click to open YouTube lightbox */}
            <button
              onClick={() => setBbcOpen(true)}
              className="group relative w-full rounded-xl overflow-hidden bg-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 bg-cover bg-center"
              style={{ aspectRatio: "16/9", backgroundImage: "url(/bbc-dennis-muraguri-zuri.jpg)" }}
              aria-label="Play BBC video"
            >
              {/* dark scrim over thumbnail */}
              <div className="absolute inset-0 bg-black/40" />
              <Image
                src="/bbc-white.svg"
                alt="BBC"
                width={60}
                height={22}
                className="absolute top-4 left-4 z-10 h-5 w-auto"
              />
              {/* play button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform duration-200 group-hover:scale-110">
                  <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-left">
                <p className="text-xs text-gray-400 uppercase tracking-widest">BBC News</p>
                <p className="text-sm text-white font-medium mt-1">
                  Dennis Muraguri × Zuri Fashion
                </p>
              </div>
            </button>
            <VideoModal
              src="https://www.youtube.com/embed/Ib2eQU7u7Zk?start=9&autoplay=1"
              isOpen={bbcOpen}
              onClose={() => setBbcOpen(false)}
              title="BBC: Dennis Muraguri collaboration with Zuri"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
