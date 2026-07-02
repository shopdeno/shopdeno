"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { getSaleorClient, getChannel } from "@/lib/saleor";
import { PRODUCTS_QUERY } from "@/graphql/queries";
import { siteConfig } from "@/lib/site-config";
import { VideoModal } from "@/components/VideoModal";

// Static metadata must live in a separate layout or route segment when using
// "use client". Homepage metadata is set in layout.tsx via siteConfig.

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [vimeoOpen, setVimeoOpen] = useState(false);

  useEffect(() => {
    const client = getSaleorClient();
    const channel = getChannel();
    (async () => {
      try {
        const result: any = await client.query(PRODUCTS_QUERY, {
          channel,
          first: 12,
          sortBy: { field: "PUBLICATION_DATE", direction: "DESC" },
        });
        setProducts(result.data?.products?.edges || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

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
            Matatu Art Prints by Dennis Muraguri
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-gray-300">
            High-quality reproductions of Muraguri&apos;s iconic and colourful original woodblock
            reduction prints of Kenya&apos;s vibrant Matatu and street art culture
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/products"
              className="rounded-md bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700"
            >
              Shop Matatu Prints
            </Link>
            <Link
              href="#about-artist"
              className="text-base font-medium text-white underline underline-offset-4 py-3"
            >
              About Dennis →
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

      {/* ── Section 2: Matatus Are a Way of Life ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
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
      </section>

      {/* ── Section 3: Product Scroll ── */}
      <section className="py-12 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              HIGH-QUALITY REPRODUCTION ART PRINTS
            </h2>
            <Link
              href="/products"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500 whitespace-nowrap"
            >
              View all prints →
            </Link>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {products.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-none w-56 snap-start">
                    <div className="aspect-square w-full rounded-lg bg-gray-200 animate-pulse" />
                    <div className="mt-3 h-4 w-3/4 rounded bg-gray-200 animate-pulse" />
                    <div className="mt-2 h-4 w-1/3 rounded bg-gray-200 animate-pulse" />
                  </div>
                ))
              : products.map(({ node: product }: any) => {
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
                      <h3 className="mt-3 text-sm font-medium text-gray-700">{product.name}</h3>
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

      {/* ── Section 4: About the Artist ── */}
      <section id="about-artist" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
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
          </div>
          <div className="flex flex-col gap-6">
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden">
              <Image
                src="/dennis-muraguri.avif"
                alt="Dennis Muraguri"
                fill
                className="object-cover object-top"
              />
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">
                All art prints are high quality reproductions signed by Dennis
              </p>
              <Image
                src="/signature.avif"
                alt="Dennis Muraguri signature"
                width={80}
                height={40}
                className="flex-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Featured Products (video bg) ── */}
      <section className="relative overflow-hidden bg-gray-900">
        <div className="absolute inset-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover opacity-40"
            src="/matatu-video.mp4"
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Featured Prints
          </p>
          <h2 className="text-3xl font-bold text-white mb-10">From the Collection</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <Link href="/products/matatu-for-president-kacose-sacco" className="group">
              <div className="relative aspect-square rounded-xl overflow-hidden">
                <Image
                  src="/matatu-for-president.avif"
                  alt="Matatu for President matatu art print by Dennis Muraguri"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h3 className="mt-4 text-xl font-bold text-white uppercase">Matatu 4 President</h3>
              <p className="text-gray-400 text-sm">Manyaga, Music, Mischief &amp; Mayhem.</p>
            </Link>
            <Link href="/products/ecko-unltd-ongata-line-transporters" className="group">
              <div className="relative aspect-square rounded-xl overflow-hidden">
                <Image
                  src="/ecko-unltd.avif"
                  alt="Eckō Unltd matatu art print by Dennis Muraguri"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <h3 className="mt-4 text-xl font-bold text-white uppercase">Eckō Unltd.</h3>
              <p className="text-gray-400 text-sm">Ongata Line Transporters</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 6: Montague Contemporary ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 text-center">
        <Image
          src="/montague-contemporary-logo.avif"
          alt="Montague Contemporary"
          width={300}
          height={90}
          className="mx-auto mb-6"
        />
        <h2 className="text-2xl font-bold text-gray-900">
          Montague Contemporary<br />presents<br />Dennis Muraguri
        </h2>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600">
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
          src="https://player.vimeo.com/video/463907902"
          isOpen={vimeoOpen}
          onClose={() => setVimeoOpen(false)}
          title="Montague Contemporary presents Dennis Muraguri"
        />
      </section>

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

      {/* ── Section 8: WePresent Feature ── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
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
            <Image
              src="/wepresent-white.svg"
              alt="WeTransfer's WePresent"
              width={140}
              height={28}
              className="h-7 w-auto mb-4 brightness-0"
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
      </section>

      {/* ── Section 9: BBC Feature ── */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
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
            <iframe
              src="https://www.bbc.com/news/av-embeds/50039382"
              className="w-full rounded-xl overflow-hidden"
              style={{ aspectRatio: "16/9", border: "none", display: "block" }}
              scrolling="no"
              loading="lazy"
              title="BBC News: Dennis Muraguri collaboration with Zuri"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
