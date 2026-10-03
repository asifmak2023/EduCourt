import path from "node:path";
import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.monkeycode-ai.live", "**.monkeycode-ai.live"],
  transpilePackages: ["@eis/appearance", "@eis/i18n"],
  turbopack: {
    root: path.join(import.meta.dirname, "../.."),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
