import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: ["hudsonkit"],
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    resolveAlias: {
      "hudsonkit": "./node_modules/hudsonkit/src/index.ts",
      "hudsonkit/app-shell": "./node_modules/hudsonkit/src/app-shell.ts",
      "hudsonkit/controls": "./node_modules/hudsonkit/src/controls.ts",
      "hudsonkit/player": "./node_modules/hudsonkit/src/player.ts",
      "hudsonkit/styles": "./node_modules/hudsonkit/dist/styles.css",
      "@voxd/client": "./lib/stub.ts",
      "@xterm/xterm": "./lib/stub.ts",
      "@xterm/addon-fit": "./lib/stub.ts",
      "@xterm/addon-webgl": "./lib/stub.ts",
      "html2canvas-pro": "./lib/stub.ts",
    },
  },
};

export default nextConfig;
