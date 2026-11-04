import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ─── Compiler optimisations ────────────────────────────────────────────────
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },

  // ─── Image optimisation ────────────────────────────────────────────────────
  images: {
    // Modern formats — WebP and AVIF for significant size reduction
    formats: ["image/avif", "image/webp"],
    // Responsive image widths for srcset generation
    deviceSizes: [390, 768, 1024, 1280, 1440, 1920],
    imageSizes: [64, 128, 256, 384, 512],
    // Cache optimised images for 31 days
    minimumCacheTTL: 60 * 60 * 24 * 31,
  },

  // ─── Experimental ─────────────────────────────────────────────────────────
  experimental: {},

  // ─── Headers for caching static assets ───────────────────────────────────
  async headers() {
    return [
      {
        source: "/:portal(ambassadors|participants)/portal",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
      {
        // Long-cache static assets (fonts, images, videos in public/)
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/community/:path*",
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
