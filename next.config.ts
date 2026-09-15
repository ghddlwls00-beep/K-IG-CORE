import type { NextConfig } from "next";

/**
 * RE-006 — Content-Security-Policy.
 *
 * SHIPPED AS REPORT-ONLY FIRST, and that is deliberate: a wrong CSP breaks the
 * whole site at once (styles, audio, hydration), and it breaks it for everyone.
 * Report-Only sends violations to the browser console and blocks nothing, so
 * the policy can be checked against real traffic before it has teeth. Flip
 * `CSP_REPORT_ONLY` to false only after the console is clean on every route —
 * see `docs/qa-2026-09-15/PROGRESS.md`.
 *
 * THE POLICY IS TIGHT BECAUSE THE SITE IS FULLY SAME-ORIGIN. Checked against
 * the built HTML: the only absolute URLs on any page are this site's own
 * (canonical and og:url); there are no third-party scripts, no external fonts
 * and no analytics. Audio and video are served by this app's own route
 * handlers, so `media-src 'self'` covers them.
 *
 * `'unsafe-inline'` IS REQUIRED FOR SCRIPT AND STYLE, and it is the honest
 * weakness here. Next injects its bootstrap and the RSC flight payload as
 * inline <script>, and the app sets inline `style` attributes throughout; with
 * no nonce or hash there is no way to allow them selectively. Removing it means
 * generating a per-request nonce, which needs a proxy — the same mechanism
 * RE-016 will need. Until then this policy still blocks the classes of attack
 * that matter most (external script injection, exfiltration to another origin,
 * framing, plugin content), and it is worth having now rather than waiting.
 *
 * Deliberately absent: `upgrade-insecure-requests` (Vercel already serves HSTS
 * with preload) and `report-uri` (no collector exists — see STATUS-2026-09-16
 * §3-3; the console is the only channel, so the header carries no report target).
 */
const CSP_REPORT_ONLY = true;

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

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
          {
            key: CSP_REPORT_ONLY
              ? "Content-Security-Policy-Report-Only"
              : "Content-Security-Policy",
            value: CSP,
          },
        ],
      },
      // No blanket Cache-Control for /audio/* any more: a licensed clip must not
      // be stored by a shared cache and replayed to the next anonymous visitor.
      // The route handler sets public-immutable or private per object instead.
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
