// Generates src/data/products.json from the MongoDB dump at
// Backend/products-dump.json (created by Backend/dump-products.js).
// Re-run both whenever the inventory in MongoDB changes:
//   cd Backend  && node dump-products.js
//   cd Frontend && node scripts/generate-catalog.mjs
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const dumpPath = join(here, "..", "..", "Backend", "products-dump.json");
const outPath = join(here, "..", "src", "data", "products.json");

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

  // manager-set salePercentage wins; legacy Wix discount fields as fallback
  let salePrice;
  if (p.salePercentage > 0) {
    salePrice = round(p.price * (1 - p.salePercentage / 100));
  } else if (p.discountValue > 0) {
    salePrice =
      p.discountMode === "AMOUNT"
        ? round(p.price - p.discountValue)
        : round(p.price * (1 - p.discountValue / 100));
  }
  if (!(salePrice > 0 && salePrice < p.price)) salePrice = undefined;

  const pickupOnly = /איסוף/.test(p.ribbon || "");
  const soldOut = p.isAvailable === false; // shown greyed-out, not hidden

  products.push({
    id: String(p._id),
    name: p.name.trim(),
    price: round(p.price),
    ...(salePrice ? { salePrice } : {}),
    desc: stripHtml(p.description),
    cat,
    sub: (p.sub_cat || "").trim() || "כללי",
    third: (p.third_level || "").trim() || "כללי",
    img: p.img ? p.img.split(";")[0].trim() : "",
    ...(pickupOnly ? { pickupOnly: true } : {}),
    ...(soldOut ? { soldOut: true } : {}),
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
