// Generates src/data/products.json from the MongoDB dump at
// Backend/products-dump.json (created by Backend/dump-products.js).
// Re-run both whenever the inventory in MongoDB changes:
//   cd Backend  && node dump-products.js
//   cd Frontend && node scripts/generate-catalog.mjs
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const dumpPath = join(here, "..", "..", "Backend", "products-dump.json");
const settingsDumpPath = join(here, "..", "..", "Backend", "settings-dump.json");
const outPath = join(here, "..", "src", "data", "products.json");
const settingsOutPath = join(here, "..", "src", "data", "settings.json");

// "New" badge window — products created within this many days get isNew:true.
const NEW_DAYS = 14;
const NOW = Date.now();

const CATEGORY_SLUGS = {
  "צבעים לאמנות": "paints",
  "צבעים להובי": "hobby",
  "רישום ועפרונות": "drawing",
  "מכחולים ואביזרים": "brushes",
  "נייר לאמנות": "paper",
  "כני ציור": "easels",
  "חומרי יצירה": "craft",
  "מקרמה וטריקו": "fiber",
  "תכשיטנות": "jewelry",
};

const stripHtml = (html) =>
  (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const round = (n) => Math.round(n * 10) / 10;

const dump = JSON.parse(readFileSync(dumpPath, "utf8"));

const products = [];
const seen = new Set();

for (const p of dump) {
  const cat = CATEGORY_SLUGS[p.category];
  if (!cat) continue; // uncategorized legacy rows
  if (p.visible === false || p.isActive === false) continue; // hidden by manager
  if (!p.name || !(p.price > 0)) continue;
  if (seen.has(String(p._id))) continue;
  seen.add(String(p._id));

  // REAL SALES ONLY: a sale exists solely when the manager set salePercentage.
  // Legacy Wix discount fields are intentionally ignored.
  let salePrice;
  if (p.salePercentage > 0) {
    salePrice = round(p.price * (1 - p.salePercentage / 100));
  }
  if (!(salePrice > 0 && salePrice < p.price)) salePrice = undefined;

  const pickupOnly = /איסוף/.test(p.ribbon || "");
  const soldOut = p.isAvailable === false; // shown greyed-out, not hidden

  // "חדש" badge data: created within the last NEW_DAYS days. Older docs (and
  // any pre-timestamps rows) simply lack createdAt and are never "new".
  const createdMs = p.createdAt ? Date.parse(p.createdAt) : NaN;
  const isNew =
    Number.isFinite(createdMs) && NOW - createdMs <= NEW_DAYS * 86400000;

  // last-touched timestamp (ISO) — only emitted when the dump carries one
  const updatedRaw = p.updatedAt || p.createdAt;
  const updated = updatedRaw ? new Date(updatedRaw).toISOString() : undefined;

  // semicolon-separated list — first is the primary, the rest feed the gallery
  const allImgs = (p.img || "").split(";").map((s) => s.trim()).filter(Boolean);

  products.push({
    id: String(p._id),
    name: p.name.trim(),
    price: round(p.price),
    ...(salePrice ? { salePrice } : {}),
    desc: stripHtml(p.description),
    cat,
    sub: (p.sub_cat || "").trim() || "כללי",
    third: (p.third_level || "").trim() || "כללי",
    img: allImgs[0] || "",
    ...(allImgs.length > 1 ? { gallery: allImgs.slice(1) } : {}),
    ...(pickupOnly ? { pickupOnly: true } : {}),
    ...(soldOut ? { soldOut: true } : {}),
    ...(isNew ? { isNew: true } : {}),
    ...(updated ? { updated } : {}),
  });
}

// stable order: by category, then name — keeps diffs readable on re-runs
products.sort(
  (a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name, "he")
);

writeFileSync(outPath, JSON.stringify(products));
const kb = Math.round(JSON.stringify(products).length / 1024);
const byCat = {};
for (const p of products) byCat[p.cat] = (byCat[p.cat] || 0) + 1;
console.log(`wrote ${products.length} products (${kb} KB) -> ${outPath}`);
console.log(byCat);

// Site settings — always write a file so catalog.ts imports never break.
let rawSettings = {};
if (existsSync(settingsDumpPath)) {
  try {
    rawSettings = JSON.parse(readFileSync(settingsDumpPath, "utf8")) || {};
  } catch {
    rawSettings = {};
  }
}
const settings = {
  ribbonTexts: Array.isArray(rawSettings.ribbonTexts) ? rawSettings.ribbonTexts : [],
  featuredIds: Array.isArray(rawSettings.featuredIds) ? rawSettings.featuredIds : [],
  saleIds: Array.isArray(rawSettings.saleIds) ? rawSettings.saleIds : [],
};
writeFileSync(settingsOutPath, JSON.stringify(settings));
const saleCount = products.filter((p) => p.salePrice != null).length;
console.log(
  `wrote settings (${settings.ribbonTexts.length} ribbon, ${settings.featuredIds.length} featured, ${settings.saleIds.length} sale) -> ${settingsOutPath}`
);
console.log(`sale products: ${saleCount}`);
