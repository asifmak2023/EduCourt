import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.monkeycode-ai.live",
    "**.monkeycode-ai.live",
    "127.0.0.1",
    "localhost",
  ],
  turbopack: {
    root: path.join(import.meta.dirname, "../.."),
  },
};

export default nextConfig;
