// Auto-generated image thumbnail manifest
import thumbnails from "./image-thumbnails.json";

export const IMAGE_THUMBNAILS: Record<string, string> = thumbnails;

export function getImageThumbnail(src: string): string | undefined {
  if (!src) return undefined;
  const key = src.startsWith("/") ? src : `/${src}`;
  return IMAGE_THUMBNAILS[key] || IMAGE_THUMBNAILS[decodeURIComponent(key)];
}
