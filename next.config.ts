import type { NextConfig } from "next";
import { NON_PAGE_SOURCES, NO_SCRIPT_CONTENT_SECURITY_POLICY } from "./src/lib/csp";

/**
 * RE-006 — Content-Security-Policy.
 *
 * SHIPPED AS REPORT-ONLY FIRST, and that was deliberate: a wrong CSP breaks the
 * whole site at once (styles, audio, hydration), and it breaks it for everyone.
 * Report-Only sends violations to the browser console and blocks nothing, so
 * the policy could be checked against real traffic before it had teeth.
 *
 * NOW ENFORCED. Before flipping, production was walked with a
 * `securitypolicyviolation` listener and the console reader, over `/`, `/t/voca`,
 * `/reading`, and one live page of every course — VOCA, LISTENING, READING,
 * GRAMMAR I and II, STUDENT, CNN — plus `/admin/license`. Audio was played on
 * the VOCA and LISTENING pages and served 206 from `/audio/*`. Zero violations.
 *
 * The instrument was proved before it was trusted: a deliberate off-origin
 * script, stylesheet, font and image were injected into the live page first, and
 * all four were reported. An empty console here means nothing fired, not that
 * nothing was listening — the check that let a blank 404 page pass as fixed.
 *
 * Also verified by reading rather than by clicking, since a paid lesson cannot
 * be opened anonymously: every client-side `fetch` in `src/` is same-origin
 * (`/api/*`, `/search-index.json`), `content/` holds no absolute media URL, and
 * `NEXT_PUBLIC_MEDIA_URL` is unset, so `mediaUrl()` keeps every clip on this
 * origin. The R2 endpoints in `src/lib/` are server-side and CSP never sees them.
 *
 * If something does break, this was one boolean and a redeploy away from being
 * Report-Only again. (Removed with SEC-05 — see below.)
 *
 * THE POLICY IS TIGHT BECAUSE THE SITE IS FULLY SAME-ORIGIN. Checked against
 * the built HTML: the only absolute URLs on any page are this site's own
 * (canonical and og:url); there are no third-party scripts, no external fonts
 * and no analytics. Audio and video are served by this app's own route
 * handlers, so `media-src 'self'` covers them.
 *
 * `data:` IN `media-src` IS NEEDED, AND THE WALK ABOVE MISSED IT. On the first
 * pointerdown, touchend or keydown of every page, `unlockMobileAudio()` in
 * `src/lib/speech.ts` plays a 48-byte silent WAV from a `data:` URI, so that iOS
 * and in-app browsers count the shared <audio> element as started by the user.
 * The listener is global, so this runs on desktop too, despite the name. Under
 * `media-src 'self' blob:` the primer was blocked and its play() rejected with
 * NotSupportedError. Chrome still played the real clip afterwards; iOS was not
 * tested, and the primer exists for browsers stricter than Chrome.
 *
 * The walk saw zero violations because each page's first gesture was a play
 * button. That click swapped in the real clip as `src` before Chrome loaded the
 * primer, so nothing was loaded and nothing was reported. When the first tap
 * landed on the page heading instead, the violation was reported on production
 * (2026-09-17, `/student/s1-1`, at 375px and at desktop width), and the listener
 * was proved on that page by loading a `data:` clip by hand.
 *
 * With `data:` added, on a local `next start` at 375px: `/student/s1-1`,
 * `/phonics/mv1-01` and `/ld/d001`, first tap on the play button and first tap
 * elsewhere, gave zero violations, and the real clip played each time. Each page
 * still reported an off-origin clip, so `media-src` has not gone slack.
 *
 * `data:` rather than a silent file in `public/`: it keeps the primer exactly as
 * it was before this policy existed, with no network request inside the
 * gesture. A `data:` media resource can neither run script nor reach another
 * origin, which is the same reason `img-src` and `font-src` already allow it.
 *
 * SEC-05 — PAGES NO LONGER ALLOW `'unsafe-inline'` FOR SCRIPTS, AND THE PAGE
 * POLICY IS NOT SENT FROM HERE ANY MORE. Next writes its bootstrap and the RSC
 * flight payload as inline <script>, so this header had to allow every inline
 * script, an injected one included. `src/proxy.ts` now sends each page a policy
 * with a fresh nonce instead (`script-src 'self' 'nonce-…' 'strict-dynamic'`).
 * This file only sends `script-src 'none'`, and only on the paths that are not
 * pages (`NON_PAGE_SOURCES`: framework files, `/api/*`, clips, images, root
 * files). Both policies, the reasons for them, and why the two path sets must
 * never overlap are written in `src/lib/csp.ts`.
 *
 * The Report-Only switch that used to sit here is gone with it: the page policy
 * lives in the proxy, and taking SEC-05 back means reverting it.
 *
 * Deliberately absent: `upgrade-insecure-requests` (Vercel already serves HSTS
 * with preload) and `report-uri` (no collector exists — see STATUS-2026-09-16
 * §3-3; the console is the only channel, so the header carries no report target).
 */

const nextConfig: NextConfig = {
  // Gzip / Brotli payload compression
  compress: true,

  // Remove x-powered-by header for security and byte savings
  poweredByHeader: false,

  // React Strict Mode
  reactStrictMode: true,

  // Media keeps its same-origin browser URL, but /audio/* and /video/* are now
  // served by route handlers that check the licence before reading from R2.
  // The old fallback rewrite proxied those paths to the public bucket for
  // anyone who asked, which left the catalogue reachable after KIG-001 gated
  // the pages — object keys are sequential, so it could simply be walked.

  // Long-term immutable caching headers for static assets
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
        ],
      },
      // SEC-05: pages get their policy from `src/proxy.ts`; everything else gets
      // this one. The two path sets are disjoint — see `src/lib/csp.ts`.
      ...NON_PAGE_SOURCES.map((source) => ({
        source,
        headers: [{ key: "Content-Security-Policy", value: NO_SCRIPT_CONTENT_SECURITY_POLICY }],
      })),
      // No blanket Cache-Control for /audio/* any more: a licensed clip must not
      // be stored by a shared cache and replayed to the next anonymous visitor.
      // The route handler sets the cache per object instead, and since MEDIA-02
      // every clip is `private` (a long browser cache for free ones), because the
      // CDN answered Range requests for a stored clip with a wrong 200.
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
