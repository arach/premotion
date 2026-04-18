import type { NextConfig } from "next";
import { join } from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@hudson/sdk"],
  devIndicators: false,
  // The @hudson/sdk symlink in node_modules points up to ../hudson/...,
  // so turbopack's root must include that ancestor to traverse up.
  // Tailwind's postcss loader is pinned because lifting root loses its
  // premotion-studio/node_modules lookup.
  // TODO: remove when SDK is published as a real npm package.
  turbopack: {
    root: join(__dirname, ".."),
    resolveAlias: {
      tailwindcss: join(__dirname, "node_modules", "tailwindcss"),
    },
  },
};

export default nextConfig;
