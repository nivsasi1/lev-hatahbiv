// Write Wix variant/choice data onto the matching Mongo products.
// Covers BOTH kinds of Wix "choice" products:
//   - manageVariants=true  → per-variant prices from wix-variants.json (pull-variants.mjs)
//   - options without variant pricing → choices at the product's base price
// SAFE BY DEFAULT: dry-run unless --apply; backs up to migration/backups/ AND
// to a Mongo backup collection (products_backup_variants_<date>) before writing.
//
//   node migration/pull-wix.mjs && node migration/pull-variants.mjs   # fresh data first
//   node migration/sync-variants.mjs            # dry-run (reports only)
//   node migration/sync-variants.mjs --apply    # write to the DB_URL database
import { join } from "path";
import {
  readJson, writeJson, OUT, MIG, ensureDirs, withMongo, backupDocs,
  LOCAL_DB_URL, round1, normalize, toCsv,
} from "./lib.mjs";
import { writeFileSync } from "fs";

const arg = (f) => process.argv.includes(f);
const argVal = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
const APPLY = arg("--apply");
const uri = argVal("--uri", LOCAL_DB_URL); // DB_URL in Backend/.env (Atlas on this machine)

const wixProducts = readJson(join(MIG, "wix-products.json"));
const wixVariants = readJson(join(MIG, "wix-variants.json"));

// Wix-template placeholder rows ("I'm a product", ₪1000/₪2000 stand-ins) are
// not real inventory — never sync choices for them.
const isJunk = (p) => /^i'?m a product/i.test(p.name || "");

const isColorOption = (o) => String(o.optionType || "").toLowerCase() === "color";

// choice.value for color options is a CSS color (hex/rgb); description is the name
const choiceKey = (o, c) => (isColorOption(o) ? (c.description || c.value) : (c.value || c.description));

// Build {label, list:[{key, price?, soldOut?, swatch?}]} for one Wix product, or null.
function buildVariants(p) {
  const opts = p.productOptions || [];
  if (!opts.length) return null;

  if (p.manageVariants) {
    const entry = wixVariants[p.exportProductId || "__noexport_" + p.wixId];
    if (!entry) return { error: "no-variant-data" };
    const label = opts.map((o) => o.name).join(" / ");
    // choice-level stock/swatch lookup: optionName -> choiceKey -> choice
    const choiceInfo = new Map();
    for (const o of opts) {
      const m = new Map();
      for (const c of o.choices || []) m.set(choiceKey(o, c), c);
      choiceInfo.set(o.name, m);
    }
    const colorOpt = opts.filter(isColorOption);
    const list = [];
    let dropped = 0;
    for (const v of entry.variants) {
      if (v.variant?.visible === false) continue;
      const parts = opts.map((o) => v.choices?.[o.name]).filter(Boolean);
      if (!parts.length) continue;
      const key = parts.join(" · ");
      // legacy Wix discounts are intentionally ignored store-wide — full price only
      const priceRaw = v.variant?.priceData?.price;
      // >₪5000 is a Wix typo (e.g. 55599.8), not an art supply — drop the row
      if (priceRaw > 5000) { dropped++; continue; }
      const price = priceRaw > 0 ? round1(priceRaw) : null; // null → base price
      // sold out when any of the variant's choices is out of stock
      const soldOut = opts.some((o) => {
        const c = choiceInfo.get(o.name)?.get(v.choices?.[o.name]);
        return c ? c.inStock === false : false;
      });
      const row = { key };
      if (price != null) row.price = price;
      if (soldOut) row.soldOut = true;
      if (colorOpt.length === 1) {
        const c = choiceInfo.get(colorOpt[0].name)?.get(v.choices?.[colorOpt[0].name]);
        if (c?.value && c.value !== row.key) row.swatch = c.value;
      }
      list.push(row);
    }
    return { label, list, dropped };
  }

  // options without variant management: a pure choice list at the base price
  if (opts.length > 1) return { error: "multi-option-unmanaged" }; // only template junk has this
  const o = opts[0];
  const list = (o.choices || [])
    .filter((c) => c.visible !== false)
    .map((c) => {
      const row = { key: choiceKey(o, c) };
      if (c.inStock === false) row.soldOut = true;
      if (isColorOption(o) && c.value && c.value !== row.key) row.swatch = c.value;
      return row;
    });
  return { label: o.name, list };
}

(async () => {
  ensureDirs();
  const candidates = wixProducts.filter((p) => (p.productOptions || []).length && !isJunk(p));
  console.log(`${candidates.length} Wix products carry choices (junk filtered: ${
    wixProducts.filter((p) => (p.productOptions || []).length && isJunk(p)).length})`);
  console.log(`Target: ${uri.replace(/\/\/[^@]*@/, "//***@")}`);
  console.log(APPLY ? "MODE: APPLY (will write)\n" : "MODE: DRY-RUN (no writes — pass --apply to commit)\n");

  await withMongo(uri, async (coll, db) => {
    const all = await coll.find({}).toArray();
    const backup = backupDocs(all, "variants");
    console.log(`✓ backup: ${all.length} docs -> ${backup}`);

    const byId = new Map(all.map((d) => [d.id, d]));
    const bySku = new Map();
    for (const d of all) if (d.sku) bySku.set(String(d.sku).trim(), d);
    const byName = new Map(all.map((d) => [normalize(d.name), d]));

    const ops = [];
    const report = [];
    const unmatched = [];
    let skippedBad = 0;

    for (const p of candidates) {
      const built = buildVariants(p);
      if (!built || built.error || !built.list?.length) {
        skippedBad++;
        report.push([p.name, "-", built?.error || "empty", 0, "", "skipped"]);
        continue;
      }
      // unique keys or the picker/checkout can't address a variant
      if (new Set(built.list.map((v) => v.key)).size !== built.list.length) {
        skippedBad++;
        report.push([p.name, "-", "duplicate-keys", built.list.length, "", "skipped"]);
        continue;
      }
      const doc =
        byId.get(p.exportProductId) ||
        (p.sku && bySku.get(String(p.sku).trim())) ||
        byName.get(normalize(p.name));
      if (!doc) {
        unmatched.push([p.name, p.wixId, built.label, built.list.length,
          built.list.map((v) => v.key).join(" | ").slice(0, 200)]);
        continue;
      }
      const prices = built.list.map((v) => v.price).filter((x) => x != null);
      const range = prices.length
        ? `${Math.min(...prices)}–${Math.max(...prices)}`
        : `base ${doc.price}`;
      const flags = [];
      if (prices.length && Math.abs(Math.min(...prices) - (doc.price ?? 0)) > 0.01)
        flags.push(`base≠min(${doc.price} vs ${Math.min(...prices)})`);
      if (built.list.some((v) => v.soldOut)) flags.push("has-oos");
      if (built.dropped) flags.push(`dropped-absurd-price:${built.dropped}`);
      if (prices.some((x) => x >= 1000)) flags.push("junk-price?");
      report.push([doc.name, doc.id, built.label, built.list.length, range, flags.join(" ")]);
      ops.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: { variantLabel: built.label, variants: built.list, updatedAt: new Date() },
            $unset: { variantsNew: "", selectionTitle: "", selectionType: "" },
          },
        },
      });
    }

    // Mongo rows with legacy variant leftovers that this sync does NOT cover
    const covered = new Set(report.map((r) => r[1]));
    const legacyLeft = all.filter(
      (d) => Array.isArray(d.variantsNew) && d.variantsNew.length && !covered.has(d.id)
    );

    writeFileSync(join(OUT, "report-variants.csv"),
      toCsv(["name", "mongo_id", "label", "variants", "price_range", "flags"], report));
    writeFileSync(join(OUT, "variants-unmatched.csv"),
      toCsv(["wix_name", "wix_id", "label", "variants", "keys"], unmatched));
    console.log(`MATCHED: ${ops.length} products get variants  (report: out/report-variants.csv)`);
    console.log(`UNMATCHED (in Wix, not in Mongo): ${unmatched.length}  (out/variants-unmatched.csv)`);
    console.log(`SKIPPED (junk/empty/dupes): ${skippedBad}`);
    console.log(`LEGACY variantsNew rows left untouched: ${legacyLeft.length}`);

    if (!APPLY) { console.log("\n(dry-run complete — nothing written)"); return; }

    // Mongo-side snapshot too — restorable without leaving Atlas
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const backupColl = `products_backup_variants_${stamp}`;
    await coll.aggregate([{ $match: {} }, { $out: backupColl }]).toArray();
    console.log(`✓ Mongo backup collection: ${backupColl}`);

    for (let i = 0; i < ops.length; i += 500) {
      await coll.bulkWrite(ops.slice(i, i + 500), { ordered: false });
    }
    console.log(`\n✓ APPLIED ${ops.length} updates.`);
    console.log("Next: cd Backend && node dump-products.js ; cd Frontend && npm run generate");
  });
})().catch((e) => { console.error("✗ sync-variants failed:", e.stack || e.message); process.exit(1); });
