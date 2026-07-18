"use client";

/**
 * Get a base64-encoded low-quality placeholder (LQIP) for an image.
 * For now, returns a fixed 1x1 black pixel placeholder.
 * TODO: Improve to use dominant color or blurhash of the actual image.
 */
export function getBlurDataURL(): string {
  // 1x1 black pixel PNG
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M///QDwABhGAJzR8jQAAAABJRU5ErkJggg==";
}