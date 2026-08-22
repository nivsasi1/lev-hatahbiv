// Build-time SEO assets — run AFTER generate-catalog.mjs (`npm run generate` does both):
//   public/seo-redirects.json  old Wix URL -> new URL map, read by the Worker (worker/seo.ts)
//   public/sitemap.xml         every public page, absolute URLs on the canonical host
//   public/robots.txt
// Inputs: src/data/products.json + the committed tables in scripts/seo/ (built once by
// scripts/seo/pull-wix-maps.mjs from the Wix Stores API — the Wix catalog is frozen).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { slugify } from "./seo/slug.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SITE = "https://www.lev-hatahbiv.com"; // canonical host (what Google has indexed)
const read = (p) => JSON.parse(readFileSync(p, "utf8"));

const products = read(join(here, "..", "src", "data", "products.json"));
const productMap = read(join(here, "seo", "wix-product-map.json"));
const fallback = read(join(here, "seo", "wix-product-fallback.json"));
const collections = read(join(here, "seo", "collections-map.json"));
const topics = read(join(here, "seo", "topic-map.json"));

// ---- redirects -------------------------------------------------------------
// A product that was hidden/deleted after the map was built must not 301 into a 404 —
// degrade it to the search fallback instead.
const ids = new Set(products.map((p) => p.id));
const liveProducts = {}, liveFallback = { ...fallback };
let dropped = 0;
for (const [slug, id] of Object.entries(productMap)) {
  if (ids.has(id)) liveProducts[slug] = id;
  else (liveFallback[slug] = `/search?q=${encodeURIComponent(slug.replace(/-+/g, " "))}`), dropped++;
}
const redirects = { products: liveProducts, fallback: liveFallback, collections, paths: topics };
const redirectsPath = join(here, "..", "public", "seo-redirects.json");
writeFileSync(redirectsPath, JSON.stringify(redirects));
console.log(
  `wrote redirects: ${Object.keys(liveProducts).length} products (+${Object.keys(liveFallback).length} fallback, ${dropped} dropped), ` +
    `${Object.keys(collections).length} collections, ${Object.keys(topics).length} pages -> ${redirectsPath}`
);

// ---- sitemap ---------------------------------------------------------------
const CATEGORY_SLUGS = ["paints", "hobby", "drawing", "brushes", "paper", "easels", "craft", "fiber", "jewelry"];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const url = (path, { lastmod, priority, changefreq } = {}) =>
  `  <url><loc>${esc(SITE + encodeURI(path))}</loc>` +
  (lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : "") +
  (changefreq ? `<changefreq>${changefreq}</changefreq>` : "") +
  (priority ? `<priority>${priority}</priority>` : "") +
  `</url>`;

const subs = new Map(); // "cat|sub" -> latest updated
for (const p of products) {
  const k = `${p.cat}|${p.sub}`;
  if (!subs.has(k) || (p.updated ?? "") > (subs.get(k) ?? "")) subs.set(k, p.updated ?? "");
}
const latest = products.map((p) => p.updated ?? "").sort().at(-1) || new Date().toISOString();
const lines = [
  url("/", { lastmod: latest, priority: "1.0", changefreq: "weekly" }),
  url("/sale", { lastmod: latest, priority: "0.7", changefreq: "weekly" }),
  ...CATEGORY_SLUGS.map((c) => url(`/category/${c}`, { lastmod: latest, priority: "0.8", changefreq: "weekly" })),
  ...[...subs.entries()]
    .sort()
    .map(([k, lm]) => {
      const [cat, sub] = k.split("|");
      return url(`/category/${cat}/${slugify(sub)}`, { lastmod: lm || latest, priority: "0.7", changefreq: "weekly" });
    }),
  ...["/workshops", "/contact", "/returns", "/terms", "/privacy", "/accessibility"].map((p) =>
    url(p, { priority: "0.4", changefreq: "yearly" })
  ),
  ...products.map((p) => url(`/product/${p.id}`, { lastmod: p.updated, priority: "0.6", changefreq: "monthly" })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join("\n")}\n</urlset>\n`;
const sitemapPath = join(here, "..", "public", "sitemap.xml");
writeFileSync(sitemapPath, sitemap);
console.log(`wrote sitemap: ${lines.length} urls -> ${sitemapPath}`);

// ---- robots ----------------------------------------------------------------
const robots = `User-agent: *
Allow: /
Disallow: /manage
Disallow: /cart
Disallow: /thank-you
Disallow: /designs/
Disallow: /api/

Sitemap: ${SITE}/sitemap.xml
`;
writeFileSync(join(here, "..", "public", "robots.txt"), robots);
console.log("wrote robots.txt");
