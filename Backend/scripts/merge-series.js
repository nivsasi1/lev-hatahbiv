// Merge over-split series (third_level) into one name per brand. The Wix
// import carried a fourth level — brush SHAPE under the brand — and flattened
// it into the series name, so one brand showed up as seven chips on a shelf.
// The shape is already in every product name, so nothing is lost.
//
// Additive and idempotent: only products whose series is one of the "from"
// names change; a second run finds nothing to do. updatedAt is left alone —
// this is a taxonomy fix, not a manager edit.
//
// It also rewrites the manager's saved series order (SiteSettings.shelfOrder)
// so a ranking that named an old series keeps applying to the merged one,
// instead of silently dropping it to the end of the list.
//
//   node scripts/merge-series.js           # dry run against Atlas
//   node scripts/merge-series.js --dump    # dry run against products-dump.json (no DB)
//   node scripts/merge-series.js --apply   # write
//
// The old-Wix collection redirects that pointed at the merged series are
// retargeted in Frontend/scripts/seo/collections-map.json in the same change.
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const Product = require("../models/products/product.model");
const SiteSettings = require("../models/settings/settings.model");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Plain ASCII hyphens throughout — the existing names use them, and a
// look-alike dash would make the merged name unsearchable and give it a
// different URL slug.
const MERGES = [
  {
    into: "פרינסטון - PRINCETON",
    from: [
      "PRINCETON - Round פרינסטון עגול",
      "PRINCETON - Flat Shader פרינסטון שטוח",
      "PRINCETON - Filbert פרינסטון פילברט",
      "PRINCETON - Angular Shader פרינסטון זווית",
      "פרינסטון מיני - PRINCETON - Mini",
      "מכחול פרינסטון כללי - PRINCETON",
      "PRINCETON - מכחול פרינסטון מופ ובלנדר",
    ],
  },
  {
    into: "סיגנט - SIGNET",
    from: [
      "מכחול עגול סיגנט - SIGNET",
      "מכחול פילברט סיגנט - SIGNET",
      "מכחול שטוח סיגנט - SIGNET",
      "מכחול שטוח ארוך סיגנט - SIGNET",
      "מכחול מניפנה סיגנט - SIGNET",
    ],
  },
  {
    into: "קוהינור פוליקולור - KOH-I-NOOR",
    from: ["קוהינור מתכת - KOH-I-NOOR", "קוהינור קרטון - KOH-I-NOOR", "קוהינור מיוחד - KOH-I-NOOR"],
  },
  {
    into: "קנווס ופשתן",
    from: ["גליל קנווס/פשתן", "קנווס סיני מתוח", "קנווס מיוחד/פשתן", "קנווס איטלקי מתוח"],
  },
];

const intoOf = new Map();
for (const m of MERGES) for (const f of m.from) intoOf.set(f, m.into);

// a saved series ranking with the old names replaced by the merged one, keeping
// the merged name at the position of the FIRST old name it replaces
const rewriteOrder = (names) => {
  const out = [];
  for (const n of names) {
    const next = intoOf.get(n) ?? n;
    if (!out.includes(next)) out.push(next);
  }
  return out;
};

const main = async () => {
  const apply = process.argv.includes("--apply");
  const fromDump = process.argv.includes("--dump");

  let products;
  let settings = null;
  if (fromDump) {
    products = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "products-dump.json"), "utf8"));
    const sp = path.join(__dirname, "..", "settings-dump.json");
    if (fs.existsSync(sp)) settings = JSON.parse(fs.readFileSync(sp, "utf8"));
    console.log(`source: products-dump.json (${products.length} products) — dry run only`);
  } else {
    if (!process.env.DB_URL) throw new Error("DB_URL is not set");
    await mongoose.connect(process.env.DB_URL);
    products = await Product.find({}).select("name third_level isActive").lean();
    settings = await SiteSettings.findOne({}).lean();
    console.log(`source: MongoDB (${products.length} products)`);
  }

  // ---- plan ----
  let total = 0;
  for (const m of MERGES) {
    const rows = products.filter((p) => m.from.includes(String(p.third_level ?? "")));
    const hidden = rows.filter((p) => p.isActive === false).length;
    total += rows.length;
    console.log(`\n${m.into}  ←  ${rows.length} products (${hidden} hidden), ${m.from.length} series`);
    for (const f of m.from) {
      const n = rows.filter((p) => p.third_level === f).length;
      console.log(`   ${String(n).padStart(3)}  ${f}${n === 0 ? "   (nothing carries this name)" : ""}`);
    }
    const already = products.filter((p) => String(p.third_level ?? "") === m.into).length;
    if (already) console.log(`   ${String(already).padStart(3)}  already on "${m.into}"`);
  }
  console.log(`\n${total} products change series`);

  // a name that looks like an old one but differs by whitespace would be missed
  // silently — surface it instead
  const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
  const oldNorm = new Map([...intoOf.keys()].map((k) => [norm(k), k]));
  const nearMisses = products.filter(
    (p) => !intoOf.has(String(p.third_level ?? "")) && oldNorm.has(norm(p.third_level))
  );
  if (nearMisses.length) {
    console.log(`\nWARNING: ${nearMisses.length} products carry a whitespace variant of an old name and will NOT be merged:`);
    for (const p of nearMisses) console.log(`   ${JSON.stringify(p.third_level)}  ${p.name}`);
  }

  // saved series order that names an old series
  const order = settings && settings.shelfOrder && typeof settings.shelfOrder === "object" ? settings.shelfOrder : {};
  const orderChanges = {};
  for (const [shelf, names] of Object.entries(order)) {
    if (!Array.isArray(names)) continue;
    const next = rewriteOrder(names);
    if (JSON.stringify(next) !== JSON.stringify(names)) orderChanges[shelf] = next;
  }
  const orderKeys = Object.keys(orderChanges);
  console.log(
    orderKeys.length
      ? `\nsaved series order to rewrite on ${orderKeys.length} shelf(s): ${orderKeys.join(", ")}`
      : "\nno saved series order names a merged series"
  );

  // ---- write ----
  if (apply && !fromDump) {
    let changed = 0;
    for (const m of MERGES) {
      const res = await Product.updateMany(
        { third_level: { $in: m.from } },
        { $set: { third_level: m.into } },
        { timestamps: false }
      );
      changed += res.modifiedCount;
      console.log(`WROTE ${m.into}: ${res.modifiedCount} products`);
    }
    if (orderKeys.length) {
      const shelfOrder = { ...order, ...orderChanges };
      await SiteSettings.updateOne({}, { $set: { shelfOrder } }, { timestamps: false });
      console.log(`WROTE shelfOrder for ${orderKeys.length} shelf(s)`);
    }
    console.log(`\ndone — ${changed} products merged`);
  } else if (apply && fromDump) {
    console.log("\n--apply is ignored with --dump (no database)");
  } else {
    console.log("\ndry run only — re-run with --apply to write");
  }

  if (!fromDump) await mongoose.disconnect();
};

module.exports = { MERGES, rewriteOrder };

if (require.main === module) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
