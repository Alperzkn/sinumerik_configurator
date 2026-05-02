import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@sinumerik/telemetry"],
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  // See note in apps/web/next.config.ts — Next 16.2.3 + workspaces
  // drop the default function and the build crashes without this.
  generateBuildId: () => null,
};

export default nextConfig;
