import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile workspace packages (TS source, no build step).
  transpilePackages: ["@sinumerik/telemetry"],
  // Pin the workspace root so Turbopack doesn't walk up to ~/package-lock.json.
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  // Same anchor for the production output tracer (used for server bundles).
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  // Workaround: under npm workspaces + Next 16.2.3, the default
  // `generateBuildId` function is dropped during config merge and the
  // build crashes with `TypeError: generate is not a function`.
  // Returning `null` re-engages Next's nanoid fallback.
  generateBuildId: () => null,
};

export default nextConfig;
