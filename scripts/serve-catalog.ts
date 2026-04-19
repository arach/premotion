import { join } from "path";

const ROOT = join(import.meta.dirname || ".", "..");
const PUBLIC = join(ROOT, "public");

const server = Bun.serve({
  port: 3100,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname === "/" ? "/catalog.html" : url.pathname;
    const filePath = join(PUBLIC, path);

    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Catalog UI running at http://localhost:${server.port}`);
