/**
 * The handler shared by /audio/[...path] and /video/[...path].
 *
 * Before this existed, next.config.ts rewrote those paths straight to the
 * public bucket, so the media answered anonymous requests even after KIG-001
 * gated the pages. Now every byte passes the same licence check the lesson
 * page applies, and the bucket no longer needs to be public.
 *
 * Caching is the subtle part: a licensed response must never be stored by a
 * shared cache, or the CDN would hand one subscriber's copy to the next
 * anonymous visitor. Only the two kinds of object that are deliberately open
 * to everyone keep a long, immutable cache — and since MEDIA-02 that cache is
 * the listener's own browser, not the CDN (see below).
 */

import { cookies } from "next/headers";
import { LICENSE_SESSION_COOKIE_NAME, resolveMediaAccess, type MediaAccess } from "./mediaAccess";
import { fetchMediaObject } from "./mediaOrigin";

// Objects open to everyone, which the browser may keep for a year. Typed as
// MediaAccess["reason"] so a typo cannot pass silently. A misspelled reason
// would still answer 200 — only with the one-hour cache — so nothing outside
// would notice, and it would show up later as repeat downloads.
const LONG_BROWSER_CACHE = new Set<MediaAccess["reason"]>(["unified-speech", "free-preview"]);

export async function handleMediaRequest(
  request: Request,
  prefix: "audio" | "video",
  segments: string[],
): Promise<Response> {
  const key = [prefix, ...segments].join("/");
  if (!key || key.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const cookieValue = (await cookies()).get(LICENSE_SESSION_COOKIE_NAME)?.value;
  const access = await resolveMediaAccess(key, cookieValue);

  if (!access.allowed) {
    // 403 rather than 404: the object exists, the caller simply has no licence.
    return new Response("License required", {
      status: 403,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const range = request.headers.get("range");
  const origin = await fetchMediaObject(key, range);
  // Every answer below that does not pass the origin's body on gives it back:
  // an unread body keeps its connection (see `mediaOrigin.ts`, MEDIA-01). Never
  // awaited — awaiting the cancel of a stream nobody consumed has hung a handler
  // here before.
  const discardBody = () => void origin.body?.cancel().catch(() => {});

  // The listener may already have gone — a skipped clip, a seek — while R2 was
  // answering. Next then never starts sending this response, so it would never
  // read or cancel the body either, and its R2 connection would stay checked out
  // (reproduced on a local `next start`: 60 such hang-ups, then 502 for the next
  // clip). Give it back now, and do the same if they leave while it streams (a
  // cancel on a stream Next is already piping is refused and caught; Next then
  // cancels it itself). 499: nobody is there to read the status.
  if (request.signal.aborted) {
    discardBody();
    return new Response(null, { status: 499 });
  }
  request.signal.addEventListener("abort", discardBody, { once: true });

  if (origin.status === 404 || (!origin.body && origin.status !== 416)) {
    discardBody();
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  if (origin.status === 416) {
    discardBody();
    return new Response(null, { status: 416, headers: { "Cache-Control": "no-store" } });
  }
  // Anything that is not a delivered object is a failure, and a failure must not
  // be stored: the success headers below carry a one-year immutable cache, so a
  // clip that failed once — a transient origin fault, a misconfigured moment
  // during a deploy — stayed broken for every listener for a year, with nothing
  // able to clear it.
  if (origin.status !== 200 && origin.status !== 206) {
    discardBody();
    return new Response("Media unavailable", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const headers = new Headers();
  for (const name of ["Content-Type", "Content-Length", "Content-Range", "ETag"]) {
    const value = origin.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", prefix === "audio" ? "audio/mpeg" : "video/mp4");
  }
  headers.set("Accept-Ranges", "bytes");
  // MEDIA-02: NO CLIP IS STORED BY THE CDN, not even a free one. Free clips used
  // to be `public, max-age=31536000, immutable`, and once a plain GET had put one
  // in Vercel's CDN, every Range request for it was answered FROM THAT COPY with
  // status 200, the requested slice as the body and a Content-Range header.
  // Measured on production 2026-09-18 (`probe-media-range-cache.cjs`): after one
  // full GET, `Range: bytes=0-1` → 200 with 2 bytes, `bytes=100-199` → 200 with
  // 100 bytes. A 200 tells the player it has the whole file. Safari opens every
  // clip with `bytes=0-1`, so a cached free clip could look like a 2-byte file.
  // `private` keeps the one-year browser cache and keeps shared caches out, so
  // every Range request reaches this handler and gets a real 206. The CDN copy
  // did not save much anyway: players always send Range, and Vercel does not
  // cache a request that carries one.
  headers.set(
    "Cache-Control",
    LONG_BROWSER_CACHE.has(access.reason)
      ? "private, max-age=31536000, immutable"
      : "private, max-age=3600, no-transform",
  );

  return new Response(origin.body, { status: origin.status, headers });
}
