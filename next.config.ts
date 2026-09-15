import type { NextConfig } from "next";

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
