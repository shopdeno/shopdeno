import type { Metadata } from "next";
import Image from "next/image";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Attire — Coming Soon | Dennis Muraguri",
  description:
    "Dennis Muraguri Attire — graphic tees, tote bags and tops inspired by Nairobi matatu street culture. Dropping soon.",
};

const TEES = [
  "dennis_muraguri_1761121443_3748880838793108272_6951237033.jpg",
  "dennis_muraguri_1761121443_3748880838793145820_6951237033.jpg",
  "dennis_muraguri_1761121443_3748880838801503511_6951237033.jpg",
  "dennis_muraguri_1761121443_3748880838801529100_6951237033.jpg",
  "dennis_muraguri_1763650264_3770094129414421109_6951237033.jpg",
  "dennis_muraguri_1763650264_3770094129733227993_6951237033.jpg",
  "dennis_muraguri_1765389432_3784683324480947209_6951237033.jpg",
  "dennis_muraguri_1765389432_3784683325193985952_6951237033.jpg",
];

const TOTES = [
  "dennis_muraguri_1759921504_3738815027885948603_6951237033.jpg",
  "dennis_muraguri_1759921504_3738815027894303485_6951237033.jpg",
  "dennis_muraguri_1759921504_3738815028146005780_6951237033.jpg",
  "dennis_muraguri_1760015810_3739606121032756445_6951237033.jpg",
  "dennis_muraguri_1761736442_3754039823645044375_6951237033.jpg",
  "dennis_muraguri_1761736442_3754039823653439473_6951237033.jpg",
  "dennis_muraguri_1761736442_3754039823653449937_6951237033.jpg",
  "dennis_muraguri_1761121443_3748880839128664068_6951237033.jpg",
];

const TAGS = [
  "dennis_muraguri_1759921504_3738815027877519529_6951237033.jpg",
  "dennis_muraguri_1773175513_3849997708127911799_6951237033.jpg",
  "dennis_muraguri_1773175513_3849997708497044029_6951237033.jpg",
  "dennis_muraguri_1773175513_3849997708966788184_6951237033.jpg",
];

const TOPS = [
  "dennis_muraguri_1524249684_1761856508822578625_6951237033.jpg",
  "dennis_muraguri_1524664360_1765335065355947203_6951237033.jpg",
  "dennis_muraguri_1651988890_2833410631267448128_6951237033.webp",
];

export default function AttirePage() {
  return (
    <div className="bg-black text-white min-h-screen">

      {/* Hero */}
      <section className="relative h-[85vh] min-h-[500px] flex items-end overflow-hidden">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        >
          <source
            src="/attire/general/dennis_muraguri_1759921505_3738814073857946413_6951237033.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        <div className="relative z-10 px-6 pb-16 sm:px-12 max-w-3xl">
          <span className="inline-block mb-4 px-3 py-1 text-xs font-semibold tracking-widest uppercase border border-white/40 rounded-full text-white/80">
            Coming Soon
          </span>
          <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tight leading-none">
            Dennis<br />Muraguri<br />Attire
          </h1>
          <p className="mt-4 text-lg text-white/70 max-w-md">
            Nairobi street culture, worn.
          </p>
        </div>
      </section>

      {/* Tees */}
      <section className="px-4 sm:px-8 py-16 max-w-7xl mx-auto">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-2xl font-black uppercase tracking-widest">Graphic Tees</h2>
          <span className="text-xs text-white/40 uppercase tracking-widest">Dropping soon</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
          {TEES.slice(0, 4).map((file) => (
            <div key={file} className="relative aspect-square overflow-hidden bg-gray-900">
              <Image
                src={`/attire/tees/${file}`}
                alt="Dennis Muraguri graphic tee"
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
          ))}
          {/* video cell */}
          <div className="relative aspect-square overflow-hidden bg-gray-900">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source
                src="/attire/tees/dennis_muraguri_1763835492_3771647333335845459_6951237033.mp4"
                type="video/mp4"
              />
            </video>
          </div>
          {TEES.slice(4).map((file) => (
            <div key={file} className="relative aspect-square overflow-hidden bg-gray-900">
              <Image
                src={`/attire/tees/${file}`}
                alt="Dennis Muraguri graphic tee"
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Totes */}
      <section className="px-4 sm:px-8 py-16 max-w-7xl mx-auto border-t border-white/10">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-2xl font-black uppercase tracking-widest">Tote Bags</h2>
          <span className="text-xs text-white/40 uppercase tracking-widest">Dropping soon</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
          {TOTES.slice(0, 6).map((file) => (
            <div key={file} className="relative aspect-square overflow-hidden bg-gray-900">
              <Image
                src={`/attire/totes/${file}`}
                alt="Dennis Muraguri tote bag"
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
          ))}
          {/* video cell */}
          <div className="relative aspect-square overflow-hidden bg-gray-900">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source
                src="/attire/totes/dennis_muraguri_1759925148_3738844838725435221_6951237033.mp4"
                type="video/mp4"
              />
            </video>
          </div>
          {TOTES.slice(6).map((file) => (
            <div key={file} className="relative aspect-square overflow-hidden bg-gray-900">
              <Image
                src={`/attire/totes/${file}`}
                alt="Dennis Muraguri tote bag"
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Hang Tags */}
      <section className="px-4 sm:px-8 py-16 max-w-7xl mx-auto border-t border-white/10">
        <h2 className="text-2xl font-black uppercase tracking-widest mb-2">Custom Tags</h2>
        <p className="text-white/50 text-sm mb-8">Individually tagged. Hand-finished details.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
          {TAGS.map((file) => (
            <div key={file} className="relative aspect-square overflow-hidden bg-gray-900">
              <Image
                src={`/attire/tags/${file}`}
                alt="Dennis Muraguri attire hang tag"
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Tops */}
      <section className="px-4 sm:px-8 py-16 max-w-7xl mx-auto border-t border-white/10">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-2xl font-black uppercase tracking-widest">Tops</h2>
          <span className="text-xs text-white/40 uppercase tracking-widest">More to come</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-w-2xl">
          {TOPS.map((file) => (
            <div key={file} className="relative aspect-square overflow-hidden bg-gray-900">
              <Image
                src={`/attire/tops/${file}`}
                alt="Dennis Muraguri top"
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 px-4 sm:px-8 py-20 text-center">
        <p className="text-xs uppercase tracking-widest text-white/40 mb-4">Be first to know</p>
        <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-8">
          Attire drops soon.
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={siteConfig.social.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white text-black text-sm font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors"
          >
            <svg className="h-4 w-4 flex-none" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            Follow on Instagram
          </a>
          <a
            href={`mailto:${siteConfig.contact.email}?subject=Attire%20Drop%20Notification`}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 border border-white/30 text-white text-sm font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
          >
            Email to be notified
          </a>
        </div>
      </section>

    </div>
  );
}
