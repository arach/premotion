import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { apiPlugin } from "./vite-api";

export default defineConfig({
  plugins: [react(), apiPlugin()],
  root: ".",
  publicDir: "public",
  server: {
    port: 3100,
  },
  build: {
    outDir: "dist",
  },
});
