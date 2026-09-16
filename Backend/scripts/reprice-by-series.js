// Reprice a product line from a series table in Backend/pricing/<table>.json:
// every colour belongs to a manufacturer series, and each series has one store
// price. Matching is by product name inside the table's third_level — case,
// punctuation and word order are ignored and common spelling slips (Pyrole,
// Bismoth, Primorse…) are tolerated, so the catalogue's typos don't need fixing
// first.
//
// Dry run by default: prints the plan (per-series counts and prices, names the
// table doesn't know, table entries with no product, duplicates) and writes
// nothing. A series priced null in the table is skipped, and so is every
// product already at its target price — a second run finds nothing to do.
//
//   node scripts/reprice-by-series.js golden-heavy-body           # dry run against Atlas
//   node scripts/reprice-by-series.js golden-heavy-body --dump    # dry run against products-dump.json
//   node scripts/reprice-by-series.js golden-heavy-body --apply   # write
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const Product = require("../models/products/product.model");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// spelling slips seen in the catalogue and in supplier lists
const SLIPS = [
  [/pyrole/g, "pyrrole"],
  [/bismoth/g, "bismuth"],
  [/primorse/g, "primrose"],
  [/grey/g, "gray"],
  [/pthalo|phtalo/g, "phthalo"],
  [/cadium/g, "cadmium"],
  [/quinacridon\b/g, "quinacridone"],
  [/benzimidazalone/g, "benzimidazolone"],
  [/irridescent|iridiscent/g, "iridescent"],
  [/turquois\b/g, "turquoise"],
  [/ultramarin\b/g, "ultramarine"],
  [/flourescent|flurescent/g, "fluorescent"],
  [/\bfine\b/g, ""], // "(Fine)" on the iridescents is packaging, not colour
  [/\btitanate\b/g, ""],
];

const wordsOf = (name) => {
  let s = String(name ?? "")
    .toLowerCase()
    .replace(/['’`.,\-–/()]/g, " ");
  for (const [re, to] of SLIPS) s = s.replace(re, to);
  return s.split(/\s+/).filter(Boolean);
};
// word order kept: "Phthalo Green (Blue Shade)" and "Phthalo Blue (Green Shade)"
// are different colours with the same words
const keyOf = (name) => wordsOf(name).join(" ");
// order-blind fallback for "N2 Neutral Gray" vs "Neutral Gray N2" — used only
// where it is unambiguous in the table
const looseKeyOf = (name) => wordsOf(name).sort().join(" ");

const loadTable = (name) => {
  const file = path.join(__dirname, "..", "pricing", `${name}.json`);
  if (!fs.existsSync(file)) throw new Error(`no such table: ${file}`);
  const t = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!t.third_level || !t.prices || !t.series) throw new Error(`${name}.json needs third_level, prices and series`);
  // one key → one series; two table entries collapsing to the same key would
  // price a colour twice
  const byKey = new Map();
  const byLoose = new Map(); // loose key → entry, or null once two entries share it
  for (const [series, names] of Object.entries(t.series)) {
    for (const n of names) {
      const k = keyOf(n);
      if (byKey.has(k)) throw new Error(`table entries collide: "${n}" (S${series}) and "${byKey.get(k).name}" (S${byKey.get(k).series})`);
      const entry = { name: n, series, key: k };
      byKey.set(k, entry);
      const lk = looseKeyOf(n);
      byLoose.set(lk, byLoose.has(lk) ? null : entry);
    }
  }
  const lookup = (name) => byKey.get(keyOf(name)) ?? byLoose.get(looseKeyOf(name)) ?? null;
  return { ...t, byKey, lookup };
};

const main = async () => {
  const args = process.argv.slice(2);
  const tableName = args.find((a) => !a.startsWith("--"));
  if (!tableName) throw new Error("usage: reprice-by-series.js <table> [--dump] [--apply]");
  const apply = args.includes("--apply");
  const fromDump = args.includes("--dump");
  const t = loadTable(tableName);

  let products;
  if (fromDump) {
    products = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "products-dump.json"), "utf8"));
    console.log(`source: products-dump.json — dry run only`);
  } else {
    if (!process.env.DB_URL) throw new Error("DB_URL is not set");
    await mongoose.connect(process.env.DB_URL);
    products = await Product.find({ third_level: t.third_level }).select("name price third_level isActive salePercentage").lean();
    console.log("source: MongoDB");
  }
  const line = products.filter((p) => p.third_level === t.third_level);
  console.log(`${t.third_level}: ${line.length} products, ${t.byKey.size} names in the table, ${Object.keys(t.series).length} series`);

  // ---- plan ----
  const plan = []; // { p, series, price }
  const unknown = [];
  const hits = new Map(); // table key → products matched
  for (const p of line) {
    const entry = t.lookup(p.name);
    if (!entry) { unknown.push(p); continue; }
    hits.set(entry.key, (hits.get(entry.key) || []).concat(p));
    plan.push({ p, series: entry.series, price: t.prices[entry.series] });
  }

  console.log("\nseries  price    products   (already there / to change)");
  let toChange = 0, skippedNoPrice = 0;
  for (const s of Object.keys(t.series)) {
    const rows = plan.filter((r) => r.series === s);
    const price = t.prices[s];
    if (price == null) {
      skippedNoPrice += rows.length;
      console.log(`  S${s}    (none)   ${String(rows.length).padStart(3)}     skipped — no price in the table`);
      continue;
    }
    const same = rows.filter((r) => Number(r.p.price) === price).length;
    toChange += rows.length - same;
    const from = [...new Set(rows.map((r) => r.p.price))].sort((a, b) => a - b).join("/");
    console.log(`  S${s}    ${String(price.toFixed(2)).padStart(6)}   ${String(rows.length).padStart(3)}     ${same} / ${rows.length - same}   (now ${from || "-"})`);
  }
  console.log(`\n${toChange} products change price, ${skippedNoPrice} skipped (series without a price)`);

  const dups = [...hits.entries()].filter(([, ps]) => ps.length > 1);
  if (dups.length) {
    console.log(`\n${dups.length} colours appear more than once in the catalogue (all copies get the series price):`);
    for (const [, ps] of dups) console.log(`   ${ps.map((p) => `"${p.name}"`).join("  +  ")}`);
  }
  if (unknown.length) {
    console.log(`\nWARNING: ${unknown.length} products on this shelf are not in the table and keep their price:`);
    for (const p of unknown) console.log(`   ${JSON.stringify(p.name)}  (₪${p.price})`);
  }
  const unhit = [...t.byKey.entries()].filter(([k]) => !hits.has(k));
  if (unhit.length) {
    console.log(`\nnote: ${unhit.length} table entries match no product:`);
    for (const [, e] of unhit) console.log(`   S${e.series}  ${e.name}`);
  }
  const onSale = plan.filter((r) => r.price != null && Number(r.p.price) !== r.price && r.p.salePercentage > 0);
  if (onSale.length) console.log(`\nnote: ${onSale.length} of the products to reprice are on sale — the sale percentage stays and applies to the new price`);

  // ---- write ----
  if (apply && !fromDump) {
    let changed = 0;
    for (const s of Object.keys(t.series)) {
      const price = t.prices[s];
      if (price == null) continue;
      const ids = plan.filter((r) => r.series === s && Number(r.p.price) !== price).map((r) => r.p._id);
      if (!ids.length) continue;
      const res = await Product.updateMany({ _id: { $in: ids } }, { $set: { price } });
      changed += res.modifiedCount;
      console.log(`WROTE S${s} → ₪${price.toFixed(2)}: ${res.modifiedCount} products`);
    }
    console.log(`\ndone — ${changed} products repriced`);
  } else if (apply && fromDump) {
    console.log("\n--apply is ignored with --dump (no database)");
  } else {
    console.log("\ndry run only — re-run with --apply to write");
  }
  if (!fromDump) await mongoose.disconnect();
};

module.exports = { keyOf, looseKeyOf, loadTable };

if (require.main === module) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
