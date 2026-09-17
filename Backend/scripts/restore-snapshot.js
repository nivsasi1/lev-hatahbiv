// Put the catalogue back to a snapshot taken by scripts/snapshot.js.
//
//   node scripts/restore-snapshot.js <name>               # dry run: what would change
//   node scripts/restore-snapshot.js <name> --apply       # restore products + settings
//   node scripts/restore-snapshot.js <name> --apply --delete-new
//                                  # ...and also delete products created after the snapshot
//
// Every product in the snapshot is written back exactly as it was (same _id,
// same fields, same timestamps); one deleted since is re-created. Products
// that did not exist at snapshot time are KEPT unless --delete-new is given —
// the dry run lists them so nothing is removed by surprise. A second run
// finds nothing to change.
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const Product = require("../models/products/product.model");
const SiteSettings = require("../models/settings/settings.model");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const DIR = path.join(__dirname, "..", "snapshots");
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

// a stored document as JSON → what goes back into Mongo (the dump turns
// ObjectIds and Dates into strings; only _id/createdAt/updatedAt are affected)
const toDoc = (json) => {
  const doc = { ...json };
  doc._id = new mongoose.Types.ObjectId(String(json._id));
  for (const k of ["createdAt", "updatedAt"]) {
    if (typeof doc[k] === "string" && ISO.test(doc[k])) doc[k] = new Date(doc[k]);
  }
  return doc;
};

// stable text of a document for "did it change?" — the same normalisation on
// both sides, so a Date and its ISO string compare equal
const canon = (doc) => {
  const norm = (v) => {
    if (v instanceof Date) return v.toISOString();
    if (v && typeof v === "object" && typeof v.toHexString === "function") return v.toHexString();
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, norm(v[k])]));
    return v;
  };
  return JSON.stringify(norm(doc));
};

// pure: what a restore would do. `current` and `wanted` are plain lists of docs.
const planRestore = (wanted, current) => {
  const cur = new Map(current.map((p) => [String(p._id), p]));
  const plan = { restore: [], recreate: [], unchanged: 0, newSince: [] };
  const seen = new Set();
  for (const w of wanted) {
    const id = String(w._id);
    seen.add(id);
    const c = cur.get(id);
    if (!c) plan.recreate.push(w);
    else if (canon(c) !== canon(w)) plan.restore.push(w);
    else plan.unchanged++;
  }
  for (const [id, c] of cur) if (!seen.has(id)) plan.newSince.push(c);
  return plan;
};

const SETTINGS_SKIP = new Set(["_id", "__v", "createdAt", "updatedAt"]);
const settingsPatch = (wanted, current) => {
  const patch = {};
  for (const [k, v] of Object.entries(wanted || {})) {
    if (SETTINGS_SKIP.has(k)) continue;
    if (canon(v) !== canon((current || {})[k])) patch[k] = v;
  }
  return patch;
};

const main = async () => {
  const args = process.argv.slice(2);
  const name = args.find((a) => !a.startsWith("--"));
  if (!name) throw new Error("usage: restore-snapshot.js <snapshot name> [--apply] [--delete-new]");
  const apply = args.includes("--apply");
  const deleteNew = args.includes("--delete-new");
  const file = path.join(DIR, name.endsWith(".json") ? name : `${name}.json`);
  if (!fs.existsSync(file)) {
    const have = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")) : [];
    throw new Error(`no such snapshot: ${name}\navailable: ${have.join(", ") || "(none)"}`);
  }
  const snap = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(snap.products)) throw new Error("not a snapshot file (no products array)");
  console.log(`snapshot ${name}: taken ${snap.takenAt}, ${snap.products.length} products`);

  if (!process.env.DB_URL) throw new Error("DB_URL is not set");
  await mongoose.connect(process.env.DB_URL);
  const current = await Product.find({}).lean();
  const currentSettings = (await SiteSettings.findOne({}).lean()) || {};

  const plan = planRestore(snap.products.map(toDoc), current);
  const sPatch = settingsPatch(snap.settings, currentSettings);
  console.log(`\nnow in the database: ${current.length} products`);
  console.log(`  ${String(plan.unchanged).padStart(5)}  unchanged since the snapshot`);
  console.log(`  ${String(plan.restore.length).padStart(5)}  changed since — will be put back`);
  console.log(`  ${String(plan.recreate.length).padStart(5)}  deleted since — will be re-created`);
  console.log(`  ${String(plan.newSince.length).padStart(5)}  created since — ${deleteNew ? "WILL BE DELETED (--delete-new)" : "kept (pass --delete-new to remove them)"}`);
  const show = (list, f) => { for (const p of list.slice(0, 15)) console.log(`      ${f(p)}`); if (list.length > 15) console.log(`      … and ${list.length - 15} more`); };
  if (plan.restore.length) { console.log("  changed:"); show(plan.restore, (p) => p.name); }
  if (plan.recreate.length) { console.log("  deleted since:"); show(plan.recreate, (p) => p.name); }
  if (plan.newSince.length) { console.log("  created since:"); show(plan.newSince, (p) => p.name); }
  const sKeys = Object.keys(sPatch);
  console.log(sKeys.length ? `settings: ${sKeys.length} key(s) differ and will be put back: ${sKeys.join(", ")}` : "settings: unchanged");

  if (apply) {
    const writes = [...plan.restore, ...plan.recreate];
    let written = 0;
    for (let i = 0; i < writes.length; i += 500) {
      const ops = writes.slice(i, i + 500).map((doc) => {
        const { _id, ...rest } = doc;
        return { replaceOne: { filter: { _id }, replacement: rest, upsert: true } };
      });
      // the native collection: an exact copy, no schema defaults or timestamp bumps
      const r = await Product.collection.bulkWrite(ops, { ordered: false });
      written += (r.modifiedCount || 0) + (r.upsertedCount || 0);
    }
    console.log(`\nWROTE ${written} products`);
    if (deleteNew && plan.newSince.length) {
      const r = await Product.deleteMany({ _id: { $in: plan.newSince.map((p) => p._id) } });
      console.log(`DELETED ${r.deletedCount} products created after the snapshot`);
    }
    if (sKeys.length) {
      await SiteSettings.updateOne({}, { $set: sPatch }, { upsert: true, timestamps: false });
      console.log(`WROTE settings (${sKeys.join(", ")})`);
    }
    console.log("\ndone — run publish-catalog so the live site follows");
  } else {
    console.log("\ndry run only — re-run with --apply to restore");
  }
  await mongoose.disconnect();
};

module.exports = { planRestore, settingsPatch, toDoc, canon };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
