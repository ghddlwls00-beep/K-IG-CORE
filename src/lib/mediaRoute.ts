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
 * to everyone keep a public, immutable cache.
 */

import { cookies } from "next/headers";
import { LICENSE_SESSION_COOKIE_NAME, resolveMediaAccess, type MediaAccess } from "./mediaAccess";
import { fetchMediaObject } from "./mediaOrigin";

// Typed as MediaAccess["reason"] so a typo cannot pass silently. A misspelled
// reason would still answer 200 — only without the shared cache — so nothing
// outside would notice, and it would show up later as origin load.
const PUBLICLY_CACHEABLE = new Set<MediaAccess["reason"]>(["unified-speech", "free-preview"]);

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

  if (origin.status === 404 || (!origin.body && origin.status !== 416)) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  if (origin.status === 416) {
    return new Response(null, { status: 416, headers: { "Cache-Control": "no-store" } });
  }
  // Anything that is not a delivered object is a failure, and a failure must not
  // be stored: the success headers below carry a one-year immutable cache, so a
  // clip that failed once — a transient origin fault, a misconfigured moment
  // during a deploy — stayed broken for every listener for a year, with nothing
  // able to clear it.
  // The origin's body is left unread rather than cancelled: cancelling a stream
  // that was never consumed has hung a handler here before.
  if (origin.status !== 200 && origin.status !== 206) {
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
  headers.set(
    "Cache-Control",
    PUBLICLY_CACHEABLE.has(access.reason)
      ? "public, max-age=31536000, immutable"
      : "private, max-age=3600, no-transform",
  );

  return new Response(origin.body, { status: origin.status, headers });
}
