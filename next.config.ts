import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    resolveAlias: {
      "@voxd/client": "./lib/stub.ts",
      "@xterm/xterm": "./lib/stub.ts",
      "@xterm/addon-fit": "./lib/stub.ts",
      "@xterm/addon-webgl": "./lib/stub.ts",
      "html2canvas-pro": "./lib/stub.ts",
    },
  },
};

export default nextConfig;
