// READ-ONLY report: compare the shop's POS export (migration/pos*.csv, columns:
// קוד פריט, ברקוד, תאור פריט, שם מחלקה, מחיר קניה, מחיר מכירה, מלאי נוכחי)
// against the site catalog (Backend/products-dump.json). Writes review CSVs to
// migration/out/ — NOTHING is written to MongoDB.
//   node migration/reconcile-pos.mjs
import { join } from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { MIG, OUT, BACKEND, ensureDirs, normalize, toCsv, round1 } from "./lib.mjs";

const posPath = ["pos.csv.csv", "pos.csv"].map((f) => join(MIG, f)).find(existsSync);
if (!posPath) {
  console.error("✗ no pos*.csv in migration/");
  process.exit(1);
}

// ---- parse POS (unquoted CSV; extra commas can only live in the name field) ----
const raw = readFileSync(posPath, "utf8").replace(/^﻿/, "");
const lines = raw.split(/\r?\n/).filter((l) => l.trim());
const pos = [];
for (const line of lines.slice(1)) {
  const f = line.split(",").map((s) => s.trim());
  if (f.length < 7) continue;
  // fixed tail: dep, cost, price, stock, (trailing empty) — name absorbs the middle
  const tailStart = f.length - 5;
  pos.push({
    code: f[0],
    barcode: f[1],
    name: f.slice(2, tailStart).join(","),
    dep: f[tailStart],
    cost: Number(f[tailStart + 1]),
    price: Number(f[tailStart + 2]),
    stock: Number(f[tailStart + 3]),
  });
}
const posByBarcode = new Map();
for (const r of pos) if (r.barcode) posByBarcode.set(r.barcode, r);
const posByName = new Map();
for (const r of pos) {
  const n = normalize(r.name);
  if (n && !posByName.has(n)) posByName.set(n, r); // first wins; dups get review anyway
}

// ---- site catalog (active products only — the live site) ----
const dump = JSON.parse(readFileSync(join(BACKEND, "products-dump.json"), "utf8"));
const site = dump.filter((p) => p.isActive !== false && p.visible !== false);

ensureDirs();
const fmt = (n) => (Number.isFinite(n) ? String(round1(n)) : "");

let byBarcode = 0;
let byName = 0;
const priceDiffs = [];
const stockConflicts = [];
const noPosMatch = [];
const matchedPosBarcodes = new Set();

for (const p of site) {
  const sku = String(p.sku ?? "").trim();
  let hit = sku ? posByBarcode.get(sku) : undefined;
  let how = hit ? "ברקוד" : "";
  if (!hit) {
    hit = posByName.get(normalize(p.name));
    if (hit) how = "שם זהה";
  }
  if (!hit) {
    if (sku) noPosMatch.push([p.name, sku, fmt(p.price), p.category]);
    continue;
  }
  if (how === "ברקוד") byBarcode++;
  else byName++;
  if (hit.barcode) matchedPosBarcodes.add(hit.barcode);

  const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
  const sitePrice = Number(p.price);
  const diff = round1(hit.price - sitePrice);
  if (Number.isFinite(hit.price) && hit.price > 0 && Math.abs(diff) >= 0.1) {
    priceDiffs.push({
      row: [
        p.name, sku || "", how, fmt(sitePrice), fmt(hit.price), fmt(diff),
        sitePrice > 0 ? Math.round((diff / sitePrice) * 100) + "%" : "",
        hasVariants ? "כן" : "", hit.stock, hit.name,
      ],
      abs: Math.abs(diff),
    });
  }

  // stock: POS says none but the site sells / the site says none but POS has
  const siteOos = p.isAvailable === false;
  if (hit.stock <= 0 && !siteOos) {
    stockConflicts.push([p.name, sku || "", how, "בקופה אזל (" + hit.stock + ") — באתר במלאי", fmt(sitePrice)]);
  } else if (hit.stock > 0 && siteOos) {
    stockConflicts.push([p.name, sku || "", how, "באתר אזל — בקופה יש " + hit.stock, fmt(sitePrice)]);
  }
}

priceDiffs.sort((a, b) => b.abs - a.abs);

writeFileSync(join(OUT, "pos-price-diff.csv"), toCsv(
  ["שם באתר", "ברקוד", "הותאם לפי", "מחיר באתר", "מחיר בקופה", "הפרש", "הפרש %", "מוצר עם אפשרויות", "מלאי בקופה", "שם בקופה"],
  priceDiffs.map((x) => x.row)
));
writeFileSync(join(OUT, "pos-stock-conflicts.csv"), toCsv(
  ["שם באתר", "ברקוד", "הותאם לפי", "מצב", "מחיר באתר"], stockConflicts
));
writeFileSync(join(OUT, "pos-no-match.csv"), toCsv(
  ["שם באתר", "ברקוד באתר (לא נמצא בקופה)", "מחיר באתר", "קטגוריה"], noPosMatch
));

const skuCount = site.filter((p) => String(p.sku ?? "").trim()).length;
console.log(`POS rows: ${pos.length} (${posByBarcode.size} with barcode)`);
console.log(`site active products: ${site.length} (${skuCount} with sku)`);
console.log(`matched: ${byBarcode} by barcode + ${byName} by exact name = ${byBarcode + byName}`);
console.log(`price differences (≥ ₪0.1): ${priceDiffs.length} -> out/pos-price-diff.csv`);
console.log(`stock conflicts: ${stockConflicts.length} -> out/pos-stock-conflicts.csv`);
console.log(`site skus with no POS match: ${noPosMatch.length} -> out/pos-no-match.csv`);
