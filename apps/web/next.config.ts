import path from "node:path";
import type { NextConfig } from "next";

const HTML_CACHE_CONTROL =
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=600";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.monkeycode-ai.live",
    "**.monkeycode-ai.live",
    "127.0.0.1",
    "localhost",
  ],
  transpilePackages: ["@eis/appearance", "@eis/i18n"],
  turbopack: {
    root: path.join(import.meta.dirname, "../.."),
  },
  async headers() {
    return [
      "/",
      "/login",
      "/portal/:path*",
      "/download/:path*",
      "/dashboard/:path*",
    ].map((source) => ({
      source,
      headers: [
        { key: "Cache-Control", value: HTML_CACHE_CONTROL },
        { key: "CDN-Cache-Control", value: "public, max-age=3600" },
      ],
    }));
  },
};

export default nextConfig;
