import type { NextConfig } from "next";

const R2_MEDIA_ORIGIN = (
  process.env.NEXT_PUBLIC_MEDIA_URL ||
  "https://pub-94ce8b8436d54ffc971d30f2096951cc.r2.dev"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // Gzip / Brotli payload compression
  compress: true,

  // Remove x-powered-by header for security and byte savings
  poweredByHeader: false,

  // React Strict Mode
  reactStrictMode: true,

  // Ava clips use a same-origin browser URL. Vercel forwards missing local
  // files to R2, which also keeps strict mobile and in-app browsers happy.
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        {
          source: "/audio/azure-ava/v1/:path*",
          destination: `${R2_MEDIA_ORIGIN}/audio/azure-ava/v1/:path*`,
        },
      ],
    };
  },

  // Long-term immutable caching headers for static assets
  async headers() {
    return [
      {
        source: "/audio/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
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
