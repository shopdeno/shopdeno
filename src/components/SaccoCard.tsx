"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const WAVE_STEP_MS = 160;   // delay between consecutive cards
const IMAGE_HOLD_MS = 2800; // how long each image is visible
const FADE_MS = 700;        // crossfade duration

function toPlainText(raw?: string | null): string {
  if (!raw) return "";
  try {
    const doc = JSON.parse(raw);
    if (!Array.isArray(doc?.blocks)) return raw;
    return doc.blocks
      .filter((b: { type: string }) => b.type === "paragraph")
      .map((b: { data: { text: string } }) => b.data.text)
      .join(" ");
  } catch {
    return raw;
  }
}

interface SaccoCardProps {
  name: string;
  slug: string;
  images: string[];   // product thumbnail URLs
  index: number;      // grid position — drives wave offset
  description?: string | null;
}

export function SaccoCard({ name, slug, images, index, description }: SaccoCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    let interval: ReturnType<typeof setInterval>;
    const startTimer = setTimeout(() => {
      interval = setInterval(() => {
        setActiveIndex((i) => (i + 1) % images.length);
      }, IMAGE_HOLD_MS);
    }, index * WAVE_STEP_MS);

    return () => {
      clearTimeout(startTimer);
      clearInterval(interval);
    };
  }, [images.length, index]);

  return (
    <Link href={`/saccos/${slug}`} className="group">
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100 relative">
        {images.length === 0 ? (
          <div className="flex h-full items-center justify-center bg-gray-200">
            <span className="text-gray-400 text-sm">{name}</span>
          </div>
        ) : (
          images.map((url, i) => (
            <div
              key={url}
              className="absolute inset-0"
              style={{
                opacity: i === activeIndex ? 1 : 0,
                transition: `opacity ${FADE_MS}ms ease-in-out`,
              }}
            >
              <Image
                src={url}
                alt={`${name} print`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                className="object-cover object-center"
              />
            </div>
          ))
        )}
      </div>
      <h3 className="mt-4 text-lg font-medium text-gray-900 group-hover:text-gray-600 transition-colors">
        {name}
      </h3>
      {description && (
        <p className="mt-1 line-clamp-2 text-sm text-gray-500">{toPlainText(description)}</p>
      )}
    </Link>
  );
}
