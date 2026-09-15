import { NextResponse, type NextRequest } from "next/server";
import validRoutes from "./lib/generated/validRoutes.json";

/**
 * RE-016 — send a mistyped lesson to the ROUTER instead of to the page.
 *
 * THE BUG. `/[course]/[lesson]` reads the licence cookie, so Next cannot
 * prerender the route as a whole. It is dynamic, `dynamicParams = false` has
 * nothing to attach to, and an unknown lesson therefore reaches the page. There
 * `notFound()` is thrown after the shell has already been flushed, so Next
 * answers 404 with an empty body: `<div hidden></div>`, the flight payload in
 * `<script>` tags, and zero visible characters. The status code is right and the
 * page is white. A crawler and a JS-disabled client see that white forever.
 * Measured on production 2026-09-16: `/ld/nope` -> 404, 0 chars of
 * server-rendered text; `/kig-404-probe-x/child/grandchild` (matches no route)
 * -> 404, 665 chars. The difference is WHERE the 404 is decided.
 *
 * WHY A PROXY. This file cannot render a page either, but it runs before
 * routing, and it can hand the request over as a path that matches no route —
 * the one shape Next already renders server-side, with `not-found.tsx`, the nav
 * and a link home. Two cheaper fixes were tried and measured first and both
 * failed; the details are in `docs/qa-2026-09-15/NEXT-SESSION.md` §0-A. Do not
 * re-try them.
 *
 * WHAT IT TOUCHES: two-segment paths only, and only ones that are not on the
 * allow list. That is every shape that reaches a dynamic route calling
 * `notFound()` — `/<course>/<id>`, `/student/<id>`, `/t/<tab>` — plus the case
 * where the FIRST segment is wrong too (`/x/y`), which is why this denies by
 * default instead of only checking the paths it recognises. One-segment paths
 * are left alone: `[course]` is static with `dynamicParams = false`, so the
 * router already answers those correctly. Three or more segments match no route
 * and were never broken. `api/`, `audio/`, `video/`, `_next/` and anything with
 * a dot in it never reach this function at all — see `config.matcher`.
 *
 * THE LIST IS GENERATED AT BUILD TIME by `scripts/buildValidRoutes.mjs`, from
 * `content/` and from a scan of `src/app`, and bundled with this file. Nothing
 * is read from disk on a request.
 */

/**
 * Matches no route, so the router answers with the server-rendered 404.
 *
 * IT MUST NOT HAVE TWO SEGMENTS, and that is not a style preference — it was
 * measured. A two-segment sentinel (`/_kig/not-found`) is caught by
 * `[course]/[lesson]` itself, so the rewrite lands on the very page whose blank
 * shell this file exists to avoid: 404 with 0 chars of server-rendered text.
 * Three segments match nothing. Same build, same server: `/_kig/not-found` ->
 * 0 chars, `/_kig/route-guard/not-found` -> 665 chars.
 */
const SENTINEL = "/_kig/route-guard/not-found";

/**
 * Every two-segment path the app can actually serve.
 *
 * This is the whole safety question. Denying by default means a path that is
 * MISSING from here becomes a 404 — and turning real lessons into 404s is worse
 * than the blank page being fixed, and is what a previous attempt shipped. So
 * the list is not written by hand: course and tab slugs are read from the app's
 * own `courses.ts` / `tabs.ts`, lesson ids are the files under
 * `content/lessons/<course>/` that `getLesson()` would actually find (NOT the
 * course index — STUDENT's `s1`–`s5` are served despite being absent from it),
 * and static routes such as `/admin/license` are found by scanning `src/app`.
 * `docs/qa-2026-09-15/scripts/verify/verify-proxy-allowlist.cjs` then fetches
 * every one of those paths against a running server and fails if any of them
 * does not come back with its content.
 */
const ALLOWED = new Set<string>();
for (const [course, ids] of Object.entries(validRoutes.lessons as Record<string, string[]>)) {
  for (const id of ids) ALLOWED.add(`${course}/${id}`);
}
for (const tab of validRoutes.tabs) ALLOWED.add(`t/${tab}`);
for (const route of validRoutes.staticRoutes) ALLOWED.add(route);

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // FAIL OPEN, AND THIS IS THE IMPORTANT PART. If the generated list is ever
  // missing or empty, denying by default would 404 every lesson at once — a
  // blank page on a handful of typo URLs is a far smaller failure. An unusable
  // list means "let everything through", never "block everything".
  if (ALLOWED.size === 0) return NextResponse.next();

  // The rewrite target has three segments, so the length check below already
  // passes it through. This guard is kept so that changing the sentinel's shape
  // cannot turn into a rewrite loop.
  if (pathname.startsWith(SENTINEL)) return NextResponse.next();

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 2) return NextResponse.next();

  return ALLOWED.has(segments.join("/"))
    ? NextResponse.next()
    : NextResponse.rewrite(new URL(SENTINEL, request.url));
}

/**
 * TWO-SEGMENT PATHS ONLY, and everything else stays off this function.
 *
 * The middleware hop is not free on Vercel — measured on production 2026-09-16,
 * a page that goes through it answers in ~106ms while one that does not answers
 * in ~20ms. So the matcher is as narrow as the bug allows.
 *
 * Narrowing it is safe because two segments is the ONLY shape that was broken:
 *
 *   one segment (`/x`)        `[course]` is static with `dynamicParams = false`,
 *                             so the router already answers 404 with a real page
 *   two segments (`/ld/x`)    THE BUG — dynamic route, `notFound()` mid-stream
 *   three or more (`/x/y/z`)  matches no route, already server-rendered
 *
 * Both of the shapes left out are asserted by `verify-error-pages.cjs`, so a
 * regression here cannot pass quietly.
 *
 * `_next/` is framework traffic, `api/` is endpoints, and `/audio/...` and
 * `/video/...` are served by route handlers that answer with their own
 * statuses. Anything with a dot in it is a file: `/robots.txt`, `/sitemap.xml`,
 * `/icon.svg`, `/search-index.json` and every clip.
 */
export const config = {
  matcher: ["/((?!_next/|api/|audio/|video/|.*\\..*)[^/]+/[^/]+)"],
};
