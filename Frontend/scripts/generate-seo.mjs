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
const SITE = "https://lev-hatahbiv.com"; // canonical host — keep in sync with CANONICAL_HOST (wrangler.jsonc) + src/lib/seo.ts
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
const CATEGORY_SLUGS = ["paints", "hobby", "drawing", "brushes", "paper", "easels", "craft", "fiber", "jewelry"];
// shelves that exist right now — a manager rename in /manage must not leave a 301 pointing
// at an empty shelf, so every /category/... target is re-validated and degraded if needed
const shelves = new Set(), series = new Set();
for (const p of products) {
  shelves.add(`${p.cat}/${slugify(p.sub)}`);
  series.add(`${p.cat}/${slugify(p.sub)}/${slugify(p.third)}`);
}
let degraded = 0;
const liveTarget = (t) => {
  const m = /^\/category\/([a-z]+)\/([^?]+)(?:\?third=(.+))?$/.exec(t);
  if (!m) return t;
  const [, cat, sub, third] = m;
  if (!CATEGORY_SLUGS.includes(cat)) return (degraded++, "/");
  if (!shelves.has(`${cat}/${sub}`)) return (degraded++, `/category/${cat}`);
  if (third && !series.has(`${cat}/${sub}/${third}`)) return (degraded++, `/category/${cat}/${sub}`);
  return t;
};
const liveProducts = {}, liveFallback = {};
let dropped = 0;
for (const [slug, id] of Object.entries(productMap)) {
  if (ids.has(id)) liveProducts[slug] = id;
  else (liveFallback[slug] = `/search?q=${encodeURIComponent(slug.replace(/-+/g, " "))}`), dropped++;
}
for (const [slug, t] of Object.entries(fallback)) liveFallback[slug] = liveTarget(t);
const liveCollections = Object.fromEntries(Object.entries(collections).map(([k, v]) => [k, liveTarget(v)]));
const livePaths = Object.fromEntries(
  Object.entries(topics)
    .filter(([path, t]) => t !== path) // a page that maps to itself is not a redirect (and would loop)
    .map(([k, v]) => [k, liveTarget(v)])
);
const redirects = {
  products: liveProducts,
  fallback: liveFallback,
  collections: liveCollections,
  paths: livePaths,
  // what the SPA can actually render — the Worker answers 404 for anything else under these prefixes
  routes: { categories: CATEGORY_SLUGS, subs: [...shelves].sort() },
};
const redirectsPath = join(here, "..", "public", "seo-redirects.json");
writeFileSync(redirectsPath, JSON.stringify(redirects));
console.log(
  `wrote redirects: ${Object.keys(liveProducts).length} products (+${Object.keys(liveFallback).length} fallback, ${dropped} dropped), ` +
    `${Object.keys(liveCollections).length} collections, ${Object.keys(livePaths).length} pages, ${degraded} targets degraded -> ${redirectsPath}`
);

// ---- sitemap ---------------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const url = (path, { lastmod, priority, changefreq } = {}) =>
  `  <url><loc>${esc(SITE + encodeURI(path))}</loc>` +
  (lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : "") +
  (changefreq ? `<changefreq>${changefreq}</changefreq>` : "") +
  (priority ? `<priority>${priority}</priority>` : "") +
  `</url>`;

const subs = new Map(); // "cat|sub" -> latest updated
const thirds = new Map(); // "cat|sub|third" -> latest updated (the ?third= series shelves)
for (const p of products) {
  const k = `${p.cat}|${p.sub}`;
  if (!subs.has(k) || (p.updated ?? "") > (subs.get(k) ?? "")) subs.set(k, p.updated ?? "");
  if (p.third && p.third !== "כללי") {
    const t = `${k}|${p.third}`;
    if (!thirds.has(t) || (p.updated ?? "") > (thirds.get(t) ?? "")) thirds.set(t, p.updated ?? "");
  }
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
  ...[...thirds.entries()]
    .sort()
    .map(([k, lm]) => {
      const [cat, sub, third] = k.split("|");
      return url(`/category/${cat}/${slugify(sub)}?third=${slugify(third)}`, { lastmod: lm || latest, priority: "0.6", changefreq: "weekly" });
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
