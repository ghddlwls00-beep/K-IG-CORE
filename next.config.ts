import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gzip / Brotli payload compression
  compress: true,

  // Remove x-powered-by header for security and byte savings
  poweredByHeader: false,

  // React Strict Mode
  reactStrictMode: true,

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
