// Compare the Wix catalog (source of truth) against the current Mongo store and
// produce: reports, an upload CSV, an image manifest, and a machine plan that
// sync.mjs applies. Read-only — never writes to Mongo.
//   node migration/reconcile.mjs [--uri <mongo-uri>]
import { join } from "path";
import { writeFileSync, existsSync } from "fs";
import {
  readJson, writeJson, toCsv, OUT, MIG, ensureDirs, withMongo,
  LOCAL_DB_URL, ATLAS_DB_URL, KNOWN_CATEGORIES, normalize, round1, stripHtml,
} from "./lib.mjs";
import { buildColToTax, buildTripleIndex, assignTaxonomy } from "./taxonomy.mjs";

// agent/human-approved category overrides for brand-new collections (optional)
const ovPath = join(OUT, "collection-overrides.json");
const overrides = existsSync(ovPath) ? readJson(ovPath) : {};

const argUri = (() => {
  const u = process.argv.indexOf("--uri"); if (u > -1) return process.argv[u + 1];
  const t = process.argv.indexOf("--target"); if (t > -1 && process.argv[t + 1] === "atlas") return ATLAS_DB_URL;
  return LOCAL_DB_URL;
})();
if (!argUri) { console.error("✗ No Mongo URI (ATLAS_DB_URL not set?)"); process.exit(1); }
const mediaUrl = (f) => (f ? `https://static.wixstatic.com/media/${f}` : "");
const CHUNK = 400; // dashboard CSV import caps at 500 rows
const writeCsv = (name, headers, rows) => writeFileSync(join(OUT, name), toCsv(headers, rows));
const writeRaw = (name, text) => writeFileSync(join(OUT, name), "﻿" + text);
const pushTo = (map, key, val) => { if (!map.has(key)) map.set(key, []); map.get(key).push(val); };

(async () => {
  ensureDirs();
  const wix = readJson(join(MIG, "wix-products.json"));
  const collections = readJson(join(MIG, "wix-collections.json"));

  const mongo = await withMongo(argUri, async (coll) => {
    const docs = await coll.find({}).toArray();
    return docs.map((p) => ({
      _id: String(p._id), id: p.id || "", name: (p.name || "").trim(), nn: normalize(p.name),
      sku: (p.sku || "").trim(), price: p.price, sale: p.salePercentage || 0,
      visible: p.visible !== false, isActive: p.isActive !== false, isAvail: p.isAvailable !== false,
      img: (p.img || "").trim(), cat: p.category || "", sub: p.sub_cat || "", third: p.third_level || "",
    }));
  });

  // ---- indexes ----
  const mById = new Map(mongo.filter((m) => m.id).map((m) => [m.id, m]));
  const bySku = new Map(); for (const m of mongo) if (m.sku) pushTo(bySku, m.sku, m);
  const byNN = new Map(); for (const m of mongo) pushTo(byNN, m.nn, m);
  const wixByEid = new Map(wix.map((w) => [w.exportProductId, w]));

  // ---- match wix -> mongo (id, then unique sku, then unique name) ----
  const matchedMongo = new Set();
  const wixMatch = new Map(); // exportProductId -> mongo
  const uniq = (arr) => (arr && arr.length === 1 ? arr[0] : null);
  for (const w of wix) { const m = mById.get(w.exportProductId); if (m) { wixMatch.set(w.exportProductId, m); matchedMongo.add(m._id); } }
  for (const w of wix) {
    if (wixMatch.has(w.exportProductId) || !w.sku) continue;
    const m = uniq(bySku.get(w.sku)); if (m && !matchedMongo.has(m._id)) { wixMatch.set(w.exportProductId, m); matchedMongo.add(m._id); }
  }
  for (const w of wix) {
    if (wixMatch.has(w.exportProductId)) continue;
    const m = uniq(byNN.get(normalize(w.name))); if (m && !matchedMongo.has(m._id)) { wixMatch.set(w.exportProductId, m); matchedMongo.add(m._id); }
  }

  // Wix template demo junk ("I'm a product ...") — never import
  const isPlaceholder = (w) => /^i.?m a product/i.test((w.name || "").trim());
  const missingAll = wix.filter((w) => !wixMatch.has(w.exportProductId));
  const placeholders = missingAll.filter(isPlaceholder);
  const missing = missingAll.filter((w) => !isPlaceholder(w));
  const removed = mongo.filter((m) => !matchedMongo.has(m._id));

  // ---- taxonomy learning ----
  const colToTax = buildColToTax(wix, mById);
  const tripleIndex = buildTripleIndex(mongo);

  // ---- classify missing -> ready / review ----
  const add = [], review = [];
  for (const w of missing) {
    const tax = assignTaxonomy(w, { colToTax, collections, tripleIndex, overrides });
    const rec = {
      exportProductId: w.exportProductId, name: w.name, sku: w.sku,
      price: w.price != null ? round1(w.price) : null,
      cat: tax.cat || "", sub: tax.sub || "כללי", third: tax.third || "כללי",
      description: stripHtml(w.description), img: w.img, gallery: w.gallery,
      source: tax.source, confidence: tax.confidence,
      collectionNames: w.collectionIds.map((c) => collections[c]?.name || c).join(" | ") || tax.collectionNames || "",
    };
    const ok = tax.source !== "UNMAPPED" && KNOWN_CATEGORIES.has(rec.cat) && rec.img && rec.price > 0;
    rec.reason = ok ? "" : !rec.img ? "no image" : !(rec.price > 0) ? "no price"
      : tax.source === "UNMAPPED" ? "category unknown" : "category invalid";
    (ok ? add : review).push(rec);
  }

  // ---- changes on matched products (Wix wins) ----
  const priceRows = [], changes = [];
  let nPrice = 0, nVis = 0, nStock = 0, nImg = 0;
  for (const [eid, m] of wixMatch) {
    const w = wixByEid.get(eid);
    const set = {};
    const wp = w.price != null ? round1(w.price) : null;
    const mp = m.price != null ? round1(m.price) : null;
    const priceDiff = wp != null && mp != null && Math.abs(wp - mp) > 0.001;
    if (priceDiff) { set.price = wp; nPrice++; }
    if (w.visible !== m.visible) { set.visible = w.visible; nVis++; }
    if (w.inStock !== m.isAvail) { set.isAvailable = w.inStock; nStock++; }
    if (!m.img && w.img) { set.img = [w.img, ...w.gallery].join(";"); nImg++; }
    const wixSalePct = w.discountedPrice != null && w.price && w.discountedPrice < w.price
      ? Math.round((1 - w.discountedPrice / w.price) * 100) : 0;
    if (priceDiff || wixSalePct || m.sale) {
      priceRows.push([m.name, m.id, mp, wp, priceDiff ? round1(wp - mp) : 0, m.sale, wixSalePct,
        w.discountedPrice != null ? round1(w.discountedPrice) : "", priceDiff ? "MISMATCH -> will set Wix price" : "match"]);
    }
    if (Object.keys(set).length) changes.push({ _id: m._id, name: m.name, set });
  }

  // ---- discontinued / hidden / out-of-stock ----
  const discRows = [];
  for (const m of removed) discRows.push([m._id, m.id, m.name, m.cat, m.sub, m.third, m.price, "not-in-wix (discontinued)"]);
  for (const [eid, m] of wixMatch) {
    const w = wixByEid.get(eid);
    if (!w.visible) discRows.push([m._id, m.id, m.name, m.cat, m.sub, m.third, m.price, "wix-hidden"]);
    if (!w.inStock) discRows.push([m._id, m.id, m.name, m.cat, m.sub, m.third, m.price, "wix-out-of-stock"]);
  }

  // ---------- reports ----------
  const missRow = (r, status) => [r.exportProductId, r.name, r.sku, r.price, r.cat, r.sub, r.third, r.source, r.confidence, r.collectionNames, status];
  writeCsv("report-missing.csv",
    ["exportProductId", "name", "sku", "price", "category", "sub_cat", "third_level", "mapping_source", "confidence", "wix_collections", "status"],
    [...add.map((r) => missRow(r, "READY")), ...review.map((r) => missRow(r, "REVIEW: " + r.reason))]);

  writeCsv("report-discontinued.csv",
    ["mongo_id", "wix_export_id", "name", "category", "sub_cat", "third_level", "price", "reason"], discRows);

  writeCsv("report-prices.csv",
    ["name", "wix_export_id", "mongo_price", "wix_price", "diff", "mongo_sale_%", "wix_sale_%", "wix_discounted_price", "verdict"], priceRows);

  writeCsv("needs-category-review.csv",
    ["exportProductId", "name", "sku", "price", "suggested_cat", "suggested_sub", "suggested_third", "reason", "wix_collections"],
    review.map((r) => [r.exportProductId, r.name, r.sku, r.price, r.cat, r.sub, r.third, r.reason, r.collectionNames]));

  // upload CSVs (dashboard import format), chunked at 400
  if (add.length <= CHUNK) {
    writeCsv("add-products.csv",
      ["name", "price", "category", "sub_cat", "third_level", "description", "images", "salePercentage"],
      add.map((r) => [r.name, r.price, r.cat, r.sub, r.third, r.description, [r.img, ...r.gallery].filter(Boolean).join(";"), 0]));
  } else {
    let n = 0;
    for (let i = 0; i < add.length; i += CHUNK) {
      const part = add.slice(i, i + CHUNK);
      writeCsv(`add-products-${String(++n).padStart(2, "0")}.csv`,
        ["name", "price", "category", "sub_cat", "third_level", "description", "images", "salePercentage"],
        part.map((r) => [r.name, r.price, r.cat, r.sub, r.third, r.description, [r.img, ...r.gallery].filter(Boolean).join(";"), 0]));
    }
  }

  // image manifest
  const images = [];
  for (const r of add) for (const f of [r.img, ...r.gallery].filter(Boolean)) images.push({ filename: f, url: mediaUrl(f), reason: "new-product", product: r.name });
  for (const c of changes) if (c.set.img) for (const f of c.set.img.split(";").filter(Boolean)) images.push({ filename: f, url: mediaUrl(f), reason: "broken-existing", product: c.name });
  const imgUniq = [...new Map(images.map((i) => [i.filename, i])).values()];
  writeJson(join(OUT, "images-manifest.json"), imgUniq);

  // category map (human-readable)
  const colLines = Object.entries(colToTax)
    .sort((a, b) => (collections[a[0]]?.name || "").localeCompare(collections[b[0]]?.name || "", "he"))
    .map(([c, t]) => `| ${collections[c]?.name || c} | ${t.cat} | ${t.sub} | ${t.third} | ${t.votes}/${t.total} |`);
  const unmappedCols = [...new Set(review.flatMap((r) => r.collectionNames.split(" | ")))].filter(Boolean);
  writeRaw("report-category-map.md",
`# Category mapping (Wix collection -> storefront taxonomy)

The storefront tags every product with **category** (1 of 9) -> **sub_cat** -> **third_level**.
Wix collections are flat, so we infer the taxonomy per collection from products that already
exist in BOTH systems (majority vote). New products inherit their collection's mapping.

| Wix collection | category | sub_cat | third_level | votes |
|---|---|---|---|---|
${colLines.join("\n")}

## Collections with no confident mapping (new lines)
Products in these are listed in **needs-category-review.csv** — set their category/sub/third,
move them into add-products, then re-run sync.

${unmappedCols.length ? unmappedCols.map((c) => `- ${c}`).join("\n") : "_none_"}
`);

  // machine plan for sync.mjs
  writeJson(join(OUT, "plan.json"), {
    generatedFromUri: argUri.replace(/\/\/[^@]*@/, "//***@"),
    wixCount: wix.length, mongoCount: mongo.length, matched: wixMatch.size,
    missingReady: add.length, missingReview: review.length, removed: removed.length, changes: changes.length,
    add: add.map((r) => ({
      id: r.exportProductId, name: r.name, price: r.price, sku: r.sku,
      category: r.cat, sub_cat: r.sub, third_level: r.third,
      description: r.description, img: [r.img, ...r.gallery].filter(Boolean).join(";"),
    })),
    update: changes,
    removedDocs: removed.map((m) => ({ _id: m._id, name: m.name })),
  });

  // ---------- console summary ----------
  console.log(`\n=== RECONCILE (Wix ${wix.length}  vs  Mongo ${mongo.length}) ===`);
  console.log(`matched:        ${wixMatch.size}`);
  console.log(`MISSING ready:  ${add.length}   (auto-added)`);
  console.log(`MISSING review: ${review.length}   (needs-category-review.csv)`);
  console.log(`REMOVED:        ${removed.length}   (in store, gone from Wix)`);
  console.log(`placeholders:   ${placeholders.length}   (Wix demo junk, ignored)`);
  console.log(`changes:        price ${nPrice} | visibility ${nVis} | stock ${nStock} | image-fix ${nImg}`);
  console.log(`images to fetch:${imgUniq.length}`);
  console.log(`\nReports + CSVs + plan -> migration/out/`);
})().catch((e) => { console.error("✗ reconcile failed:", e.stack || e.message); process.exit(1); });
