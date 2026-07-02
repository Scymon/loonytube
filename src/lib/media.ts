// Client-safe media URL helpers. Keep secrets out of this file — it is
// imported by client components (lib/cloudflare.ts is server-only).

/**
 * Ask Cloudflare Stream for an appropriately sized thumbnail instead of the
 * default (large) frame. Non-Stream URLs (e.g. custom thumbs in Supabase
 * storage) pass through untouched.
 */
export function sizedThumb(url: string, width: number): string {
  if (!url.includes("videodelivery.net")) return url;
  return url + (url.includes("?") ? "&" : "?") + "width=" + width;
}
