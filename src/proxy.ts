import { NextResponse, type NextRequest } from "next/server";
import validRoutes from "./lib/generated/validRoutes.json";
import { createNonce, nonceContentSecurityPolicy } from "./lib/csp";

/**
 * This file does two jobs on every page request.
 *
 * ── 1. SEC-05: A FRESH CSP NONCE ─────────────────────────────────────────────
 *
 * A new random nonce per request, put in the page's Content-Security-Policy. The
 * policy and the reasons behind it are in `src/lib/csp.ts`.
 *
 * THE SAME POLICY GOES ON THE REQUEST AND ON THE RESPONSE, on every page return
 * path. Next takes the nonce it stamps on its <script> tags from the REQUEST
 * header; the browser enforces the RESPONSE header. If the two ever disagree — a
 * response policy with a nonce the render never saw — every script on the page is
 * blocked and the site stops working. So both are set together, and the RE-016
 * rewrite below carries them too (a 404 page runs scripts as well). `x-nonce` is
 * for the root layout only, which passes it to the one `next/script` the app
 * writes itself.
 *
 * The one branch that sets NEITHER is deliberate: a non-page path that reaches this
 * function anyway (in another letter case) already gets `script-src 'none'` from
 * `next.config.ts`, and a second policy must not be added.
 *
 * ── 2. RE-016: SEND A MISTYPED PATH TO THE ROUTER, NOT TO A PAGE ─────────────
 *
 * THE BUG. A dynamic route that calls `notFound()` answers 404 with an EMPTY body:
 * `<div hidden></div>`, the flight payload in `<script>` tags, and zero visible
 * characters. The status code is right and the page is white. A crawler and a
 * JS-disabled client see that white forever. Measured on production 2026-09-16:
 * `/ld/nope` -> 404, 0 chars of server-rendered text;
 * `/kig-404-probe-x/child/grandchild` (matches no route) -> 404, 665 chars. The
 * difference is WHERE the 404 is decided.
 *
 * WHY A PROXY. This file cannot render a page either, but it runs before routing,
 * and it can hand the request over as a path that matches no route — the one shape
 * Next already renders server-side, with `not-found.tsx`, the nav and a link home.
 * Two cheaper fixes were tried and measured first and both failed; the details are
 * in `docs/qa-2026-09-15/NEXT-SESSION.md` §0-A. Do not re-try them.
 *
 * WHAT IT CHECKS: one- and two-segment paths, denied unless they are on the allow
 * list. SINCE SEC-05 THIS IS THE ONLY GUARD. Before, `[course]` and `t/[tab]` were
 * prerendered with `dynamicParams = false`, and the router itself answered an
 * unknown `/x` with a readable 404. Reading the request headers in the root layout
 * makes every route dynamic, `dynamicParams = false` then has nothing to attach to
 * (Next only enforces it for routes listed as prerendered), and `/x` would reach
 * `[course]/page.tsx`, call `notFound()` and come back white. So one-segment paths
 * are checked here now too. Zero segments (`/`) is the home page. Three or more
 * segments match no route and were never broken. Framework files, `/api/*`, clips
 * and images are left out by `config.matcher`; they reach this function only in
 * another letter case, and are handed straight back.
 *
 * MISTYPED PATHS WITH A DOT come here too, for the same reason. `/index.html` and
 * `/.env` used to get the router's readable 404 (production, 2026-09-17: 665
 * chars); once `[course]` renders per request they would get the blank one.
 * `/ld/d001.html` was already blank. They arrive through a second matcher that
 * leaves the known files alone, and every other file the app serves at one or two
 * segments is on the list.
 *
 * THE LIST IS GENERATED AT BUILD TIME by `scripts/buildValidRoutes.mjs`, from
 * `content/` and from a scan of `src/app`, and bundled with this file. Nothing is
 * read from disk on a request.
 */

/**
 * Matches no route, so the router answers with the server-rendered 404.
 *
 * IT MUST HAVE THREE OR MORE SEGMENTS, and that is not a style preference — it was
 * measured. A two-segment sentinel (`/_kig/not-found`) is caught by
 * `[course]/[lesson]` itself, so the rewrite lands on the very page whose blank
 * shell this file exists to avoid: 404 with 0 chars of server-rendered text. Same
 * build, same server: `/_kig/not-found` -> 0 chars, `/_kig/route-guard/not-found`
 * -> 665 chars. A one-segment sentinel would land on `[course]` the same way.
 */
const SENTINEL = "/_kig/route-guard/not-found";

/**
 * Every one- and two-segment path the app can actually serve.
 *
 * This is the whole safety question. Denying by default means a path that is
 * MISSING from here becomes a 404 — and turning real lessons into 404s is worse
 * than the blank page being fixed, and is what a previous attempt shipped. So the
 * list is not written by hand: course and tab slugs are read from the app's own
 * `courses.ts` / `tabs.ts`, lesson ids are the files under
 * `content/lessons/<course>/` that `getLesson()` would actually find (NOT the
 * course index — the two have disagreed before: STUDENT's `s1`–`s5` were served
 * while absent from it, until they were removed in f3f6cb6),
 * static routes such as `/admin/license` are found by scanning `src/app`, and
 * files (`/robots.txt`, `/search-index.json`, …) by scanning `public/` and the
 * metadata files in `src/app`.
 * `docs/qa-2026-09-15/scripts/verify/verify-proxy-allowlist.cjs` then fetches every
 * one of those paths against a running server and fails if any of them does not
 * come back with its content.
 *
 * A list that cannot be read comes out EMPTY rather than throwing: with this
 * matcher a throw at module load would fail every page on the site, not a few.
 */
function buildAllowList(): Set<string> {
  const allowed = new Set<string>();
  try {
    for (const course of validRoutes.courses) allowed.add(course);
    for (const [course, ids] of Object.entries(validRoutes.lessons as Record<string, string[]>)) {
      for (const id of ids) allowed.add(`${course}/${id}`);
    }
    for (const tab of validRoutes.tabs) allowed.add(`t/${tab}`);
    for (const route of validRoutes.staticRoutes) allowed.add(route);
    for (const file of validRoutes.files) allowed.add(file);
  } catch {
    allowed.clear();
  }
  return allowed;
}

const ALLOWED = buildAllowList();

function isServable(pathname: string): boolean {
  // FAIL OPEN, AND THIS IS THE IMPORTANT PART. If the generated list is ever
  // missing or empty, denying by default would 404 every page at once — a blank
  // page on a handful of typo URLs is a far smaller failure. An unusable list
  // means "let everything through", never "block everything".
  if (ALLOWED.size === 0) return true;

  // The rewrite target has three segments, so the depth check below already
  // passes it through. This guard is kept so that changing the sentinel's shape
  // cannot turn into a rewrite loop.
  if (pathname.startsWith(SENTINEL)) return true;

  // Next's internal name for one segment of a page's RSC data
  // (`/ld.segments/_tree.segment.rsc`). Next strips the final `.rsc` before this
  // function sees the path (`normalizeRscURL`), so match with or without it. Such a
  // request belongs to a real page and must not be sent to the 404. A plain `.rsc`
  // suffix needs no rule: after the strip, `/ld/d001.rsc` is checked as `/ld/d001`.
  if (/\.segments\/.+\.segment(\.rsc)?$/.test(pathname)) return true;

  // The dev server's own endpoints (stack frames, the dev tools). Production has
  // none, so there a `/__nextjs…` path is a typo like any other.
  if (process.env.NODE_ENV === "development" && pathname.startsWith("/__nextjs")) return true;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0 || segments.length > 2) return true;
  if (ALLOWED.has(segments.join("/"))) return true;

  // Names Next gives generated files, which the build-time scan cannot spell out:
  // an icon or share image in a route group gets a hash (`/icon-a1b2c3.png`), and
  // `generateSitemaps` serves `/sitemap/0.xml`. Letting these shapes through costs
  // at most a blank 404 for a mistyped one; blocking them would 404 a real file.
  const last = segments[segments.length - 1];
  if (/^(icon|apple-icon|opengraph-image|twitter-image)(-[a-z0-9]+)?\d*(\.[a-z0-9]+)?$/i.test(last)) return true;
  if (segments.length === 2 && segments[0] === "sitemap" && /\.xml$/.test(last)) return true;
  return false;
}

/**
 * The non-page paths of `NON_PAGE_SOURCES` in `src/lib/csp.ts`, IN ANY CASE.
 *
 * `config.matcher` compares case-sensitively and `next.config.ts` matches its
 * header sources case-insensitively (Next's default). So `/API/x` or `/Images/x`
 * slips past the matcher's exclusions AND still gets the no-script policy from
 * `next.config.ts`. Adding the nonce policy on top would put two policies on one
 * response, which the whole design avoids; the next.config one is left alone.
 */
const NON_PAGE_ANY_CASE =
  /^\/(?:(?:_next|_vercel|api|audio|video|images|\.well-known)\/.|(?:robots\.txt|sitemap\.xml|favicon\.ico|icon\.svg|search-index\.json)\/?$)/i;

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ONE KNOWN OVERLAP, left on purpose: `/_next/data/<build>/<page>.json`. Next
  // shows this function the page path (`/ld/d001`), so it gets the nonce policy,
  // while next.config matched the raw `/_next/…` path and adds `script-src 'none'`.
  // This app has no Pages Router, so such a URL is always a 404, and two policies
  // only make that 404 stricter. Skipping it here would mean trusting the
  // `x-nextjs-data` request header, which any client can send with any page.
  if (NON_PAGE_ANY_CASE.test(pathname)) {
    return isServable(pathname) ? NextResponse.next() : NextResponse.rewrite(new URL(SENTINEL, request.url));
  }

  const nonce = createNonce();
  const csp = nonceContentSecurityPolicy(nonce, { dev: process.env.NODE_ENV === "development" });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const servable = isServable(pathname);
  if (!servable && process.env.NODE_ENV === "development") {
    // The list was written when the dev server started. A page, lesson or public
    // file added since then is not on it and gets this 404 until it is rebuilt.
    console.warn(`[proxy] ${pathname} is not on the allow list → 404. Added it just now? Run: node scripts/buildValidRoutes.mjs`);
  }
  const response = servable
    ? NextResponse.next({ request: { headers: requestHeaders } })
    : NextResponse.rewrite(new URL(SENTINEL, request.url), { request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  return response;
}

/**
 * EVERY PAGE, and nothing that is not a page.
 *
 * Until SEC-05 this matched two-segment paths only, because the hop is not free on
 * Vercel — measured on production 2026-09-16, a page that goes through it answered
 * in ~106ms, one that does not in ~20ms. A nonce has to be made for every page, so
 * every page pays it now; that was the owner's decision. Everything else stays off
 * this function, and gets `script-src 'none'` from `next.config.ts` instead:
 *
 *   `_next/`, `_vercel/`  framework and platform files
 *   `api/`                endpoints (JSON)
 *   `audio/`, `video/`    route handlers that answer with their own statuses, and
 *                         every Range request a player makes
 *   `images/`             every section photo. Middleware runs before the
 *                         filesystem, so matching these would add the hop to every
 *                         image and could rewrite a real file to the 404.
 *   the root files        `/robots.txt`, `/sitemap.xml`, `/favicon.ico`,
 *                         `/icon.svg`, `/search-index.json` (second entry)
 *
 * THESE EXCLUSIONS AND `NON_PAGE_SOURCES` IN `src/lib/csp.ts` ARE THE SAME LIST,
 * and must stay that way: a path in both would carry two policies, a path in
 * neither would carry none. Change them together; `verify-csp-nonce.cjs` N1 checks
 * the built matcher against the built headers.
 *
 * THE FIRST ENTRY is every path without a dot. THE SECOND is every path with one —
 * a mistyped `/index.html`, `/.env`, `/ld/d001.html`, `/a/b/c.html` — apart from
 * the files above and `/.well-known/…`. Next's internal RSC names (`/ld/d001.rsc`,
 * `/ld.segments/_tree.segment.rsc`) are NOT left out: outside Vercel they render as
 * an ordinary HTML page, which must not go out with no policy at all, and
 * `isServable` lets the real ones through. A file the app serves that is not named
 * here is on the allow list, so it is let through, not rewritten.
 *
 * LINK PREFETCHES ARE SKIPPED (`missing: next-router-prefetch`). A Link prefetch
 * is RSC data for the router, not a document, so it needs no nonce, and skipping it
 * keeps a long lesson list from paying the hop once per visible link. The proxy
 * cannot check this itself: Next strips `next-router-prefetch` from the request it
 * hands to this function. A prefetch of a mistyped lesson reaches the page and gets
 * a 404, which the client discards; the real navigation still comes through here.
 * The browser's own `Purpose: prefetch` / `Sec-Purpose` header is deliberately NOT
 * skipped: that request is for a document the browser may show, and Next's App
 * Router never sends it.
 *
 * Everything in `config` must be written out literally: Next reads it at build
 * time without running this file, and ignores a value that comes from a variable.
 */
export const config = {
  matcher: [
    {
      source: "/((?!_next/|_vercel/|api/|audio/|video/|images/|.*\\..*).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
    {
      source:
        "/((?!_next/|_vercel/|api/|audio/|video/|images/|\\.well-known/|robots\\.txt$|sitemap\\.xml$|favicon\\.ico$|icon\\.svg$|search-index\\.json$)(?=.*\\.)[^/]+(?:/[^/]+)*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
