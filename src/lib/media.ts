/**
 * Resolves a media path to the URL the browser should request.
 *
 * The extractor writes lesson JSON with app-relative paths ("/audio/ld/d001.mp3").
 * Roughly 2GB of MP3 and MP4 lives in a Cloudflare R2 bucket rather than in the
 * repository — already-compressed formats that gzip shrinks by 2–4%, so
 * committing them would bloat the checkout permanently for no benefit.
 *
 * Those paths now stay same-origin. `/audio/*` and `/video/*` are route handlers
 * that check the licence and then read from R2 on the server's behalf, so the
 * bucket needs no public access at all. Handing the browser the bucket's own URL
 * would walk straight around that check, which is why this no longer rewrites to
 * an external origin: the previous version returned
 * "https://pub-….r2.dev/audio/ld/d150.mp3" and any listener could replay it.
 *
 * NEXT_PUBLIC_MEDIA_URL is still honoured for a deployment that genuinely serves
 * media from another host (a CDN in front of its own gate, say). Leave it unset
 * — the normal case — and every reference stays on this origin.
 */

const EXTERNAL_BASE = (process.env.NEXT_PUBLIC_MEDIA_URL || "").replace(/\/+$/, "");

/**
 * Media is always reachable: the route handler serves it from the bucket when
 * the file is not on disk.
 */
export const HAS_REMOTE_MEDIA = true;

export function hasAudioFile(src?: string): boolean {
  return Boolean(src);
}

export function mediaUrl(src: string): string {
  // Anything already absolute is left alone.
  if (/^https?:\/\//i.test(src)) return src;
  const path = src.startsWith("/") ? src : `/${src}`;
  return EXTERNAL_BASE ? `${EXTERNAL_BASE}${path}` : path;
}
