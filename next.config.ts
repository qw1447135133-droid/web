import type { NextConfig } from "next";

const cdnAssetPrefix =
  process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_CDN_ASSET_PREFIX?.trim() || undefined
    : undefined;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "192.168.1.170", "*.localhost"],
  assetPrefix: cdnAssetPrefix,
  async headers() {
    return [
      {
        source: "/service-worker.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, must-revalidate",
          },
        ],
      },
      {
        source: "/(icon|apple-icon)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
