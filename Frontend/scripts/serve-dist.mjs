// Tiny zero-dependency static server for dist/ with SPA fallback.
// Used to share the built site through a tunnel (see CLAUDE.md).
//   node scripts/serve-dist.mjs [port]
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(fileURLToPath(import.meta.url), "..", "..", "dist");
const port = Number(process.argv[2]) || 4173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, "");
    if (path.includes("..")) throw new Error("bad path");
    let file = join(dist, path);
    let body;
    try {
      if (!extname(file)) throw new Error("spa");
      body = await readFile(file);
    } catch {
      file = join(dist, "index.html"); // SPA fallback
      body = await readFile(file);
    }
    res.writeHead(200, {
      "content-type": MIME[extname(file)] ?? "application/octet-stream",
      "cache-control": extname(file) === ".html" ? "no-cache" : "public, max-age=3600",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}).listen(port, () => {
  // no host arg: dual-stack bind so tunnels reaching ::1 or 127.0.0.1 both work
  console.log(`serving dist/ on http://localhost:${port}`);
});
