import Image from "next/image";
import Link from "next/link";
import { getBlurDataURL } from "@/lib/imageUtils";

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

interface BrowseItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  backgroundImage?: { url: string; alt?: string | null } | null;
}

interface BrowseLandingProps {
  title: string;
  subtitle?: string;
  items: BrowseItem[];
  hrefPrefix: string;
}

export function BrowseLanding({ title, subtitle, items, hrefPrefix }: BrowseLandingProps) {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h1>
          {subtitle && <p className="mt-4 text-lg text-gray-500">{subtitle}</p>}
        </div>

        {items.length === 0 ? (
          <div className="mt-12 text-center text-gray-500">No items found.</div>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
            {items.map((item) => (
              <Link key={item.id} href={`${hrefPrefix}/${item.slug}`} className="group">
                <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100 relative">
                  {item.backgroundImage ? (
                    <Image
                      src={item.backgroundImage.url}
                      alt={item.backgroundImage.alt || item.name}
                      fill
                      className="object-cover object-center transition-opacity group-hover:opacity-75"
                      blurDataURL={getBlurDataURL()}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gray-200">
                      <span className="text-gray-400 text-sm">{item.name}</span>
                    </div>
                  )}
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">{item.name}</h3>
                {item.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{toPlainText(item.description)}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
