// Fill each variant's barcode from the old Wix export (migration/wix-variants.json),
// where every size/colour carried its own SKU.
//
//   node scripts/backfill-variant-skus.js            → dry run (report only)
//   node scripts/backfill-variant-skus.js --apply    → write
//
// Only fills an EMPTY variant sku, and never a code that's already used anywhere
// (product or variant barcode) — so re-running can't overwrite the manager's work.
// Take a snapshot first:  node scripts/snapshot.js before-variant-skus
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const Product = require("../models/products/product.model");

const WIX = require(path.join(__dirname, "..", "..", "migration", "wix-variants.json"));
const norm = (s) => String(s || "").toLowerCase().replace(/["'`״׳]/g, "").replace(/\s+/g, " ").trim();

const main = async () => {
  const apply = process.argv.includes("--apply");
  if (!process.env.DB_URL) throw new Error("DB_URL is not set");
  await mongoose.connect(process.env.DB_URL);

  const docs = await Product.find({ "variants.0": { $exists: true } })
    .select("id name sku variants")
    .lean();
  const all = await Product.find({}).select("sku variants.sku").lean();
  const used = new Set();
  for (const d of all) for (const s of [d.sku, ...(d.variants || []).map((v) => v.sku)]) if (s) used.add(String(s).trim());

  // Wix sometimes copied one barcode onto every size of a product — a code seen
  // on more than one option is ambiguous, so it's left for the manager
  const seenInWix = new Map();
  for (const e of Object.values(WIX)) {
    for (const v of e.variants || []) {
      const sku = String(v.variant?.sku || "").trim();
      if (sku) seenInWix.set(sku, (seenInWix.get(sku) || 0) + 1);
    }
  }

  // Wix entry -> { variantKey: sku }, keyed the way sync-variants.mjs built the keys
  const wixByName = new Map();
  const skuMaps = new Map();
  for (const [key, e] of Object.entries(WIX)) {
    const opts = (e.options || []).map((o) => o.name);
    const m = {};
    for (const v of e.variants || []) {
      const sku = String(v.variant?.sku || "").trim();
      const parts = opts.map((o) => v.choices?.[o]).filter(Boolean);
      if (sku && parts.length && seenInWix.get(sku) === 1) m[parts.join(" · ")] = sku;
    }
    skuMaps.set(key, m);
    wixByName.set(norm(e.name), key);
  }

  let filled = 0, products = 0, taken = 0;
  const samples = [];
  for (const d of docs) {
    const wixKey = skuMaps.has(d.id) ? d.id : wixByName.get(norm(d.name));
    const m = wixKey && skuMaps.get(wixKey);
    if (!m || !Object.keys(m).length) continue;

    let changed = false;
    const variants = d.variants.map((v) => {
      const code = m[v.key];
      if (!code || (v.sku && String(v.sku).trim())) return v;
      if (used.has(code)) { taken++; return v; }
      used.add(code);
      changed = true;
      filled++;
      if (samples.length < 8) samples.push(`${d.name} — ${v.key}  →  ${code}`);
      return { ...v, sku: code };
    });
    if (!changed) continue;
    products++;
    if (apply) {
      // only if this product's variants are still what we read (no edit in between)
      await Product.updateOne({ _id: d._id, variants: d.variants }, { $set: { variants } });
    }
  }

  await mongoose.disconnect();
  samples.forEach((s) => console.log("  " + s));
  console.log(`\n${apply ? "applied" : "dry run"}: ${filled} variant barcodes on ${products} products` +
    (taken ? ` (${taken} skipped — code already used elsewhere)` : ""));
};

main().catch((e) => { console.error(e.message); process.exit(1); });
