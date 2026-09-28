export function getBlurDataURL(): string {
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M///QDwABhGAJzR8jQAAAABJRU5ErkJggg==";
}

const SUPABASE_OBJECT_PREFIX = "supabase.co/storage/v1/object/public/";
const SUPABASE_RENDER_PREFIX = "supabase.co/storage/v1/render/image/public/";

/** Host serving self-hosted Saleor media (Supabase Storage CDN). Preconnected
 * in the root layout so first-time visitors skip DNS+TLS setup on images. */
export const SUPABASE_MEDIA_HOST = "https://sqjpzfydzfshibhiixim.supabase.co";

/** Saleor self-host returns thumbnail proxy URLs as http:// — force https to
 * avoid mixed-content blocks on the https storefront. */
export function toHttps(url: string): string {
  return url.startsWith("http://") ? "https://" + url.slice("http://".length) : url;
}

/**
 * Return a fast, cold-start-immune, correctly-sized image URL.
 *
 * - Supabase direct media URLs (full ~3000px originals) are rewritten to the
 *   Supabase image-transformation endpoint (`render/image`) at the requested
 *   width. Those bytes are served by Supabase's CDN with no dependency on the
 *   (sleeping) Render Saleor container. Verified: 637KB/3024px → 33KB/512px.
 * - Saleor `/thumbnail/<id>/<size>/` proxy URLs and all other hosts are
 *   returned as-is (https-forced). They are already sized but require the
 *   Saleor container to be awake.
 */
export function sizedImageUrl(url: string, width: 256 | 512 | 1024 = 512): string {
  const safe = toHttps(url);
  const idx = safe.indexOf(SUPABASE_OBJECT_PREFIX);
  if (idx === -1) return safe;
  const base =
    safe.slice(0, idx) + SUPABASE_RENDER_PREFIX + safe.slice(idx + SUPABASE_OBJECT_PREFIX.length);
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}width=${width}&quality=80&resize=contain`;
}
