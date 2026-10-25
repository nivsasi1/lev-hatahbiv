// Freeze the catalogue as it is right now: every product document and the
// settings singleton, exactly as stored, into Backend/snapshots/<name>.json.
// The ops-snapshot workflow commits that file to main, so "the state before
// the manager's edits" is a file in git that ops-restore can put back.
//
//   node scripts/snapshot.js [label]     → snapshots/2026-09-17_1030[-label].json
//   node scripts/snapshot.js weekly --scheduled
//        the Sunday run: skipped when nothing changed since the newest
//        snapshot, and only the newest KEEP_WEEKLY "-weekly" files are kept
//        (snapshots taken by hand are never pruned)
//
// Not included: orders, coupons and newsletter subscribers — they live in
// D1/elsewhere and the dashboard's catalogue edits never touch them.
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const Product = require("../models/products/product.model");
const SiteSettings = require("../models/settings/settings.model");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const DIR = path.join(__dirname, "..", "snapshots");
const KEEP_WEEKLY = 8;

// snapshot files, newest first (the name starts with the date, so it sorts)
const snapshotFiles = () =>
  fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort().reverse() : [];

// the same data as the newest snapshot? (both sides as JSON, so stored Dates
// and their ISO strings compare equal)
const sameAsNewest = (products, settings) => {
  const newest = snapshotFiles()[0];
  if (!newest) return null;
  const prev = JSON.parse(fs.readFileSync(path.join(DIR, newest), "utf8"));
  const now = JSON.parse(JSON.stringify({ products, settings }));
  return JSON.stringify(prev.products) === JSON.stringify(now.products) &&
    JSON.stringify(prev.settings) === JSON.stringify(now.settings)
    ? newest.replace(/\.json$/, "")
    : null;
};

const pruneWeekly = () => {
  const old = snapshotFiles().filter((f) => f.endsWith("-weekly.json")).slice(KEEP_WEEKLY);
  for (const f of old) fs.unlinkSync(path.join(DIR, f));
  if (old.length) console.log(`pruned ${old.length} weekly snapshot(s) beyond the newest ${KEEP_WEEKLY}: ${old.join(", ")}`);
};

// Israel local time in the file name, so the manager can read it
const stamp = () => {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date()).reduce((o, x) => ((o[x.type] = x.value), o), {});
  return `${p.year}-${p.month}-${p.day}_${p.hour}${p.minute}`;
};

const main = async () => {
  const scheduled = process.argv.includes("--scheduled");
  const label = (process.argv.slice(2).find((a) => !a.startsWith("--")) || "").trim().toLowerCase().replace(/[^a-z0-9֐-׿-]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  if (!process.env.DB_URL) throw new Error("DB_URL is not set");
  await mongoose.connect(process.env.DB_URL);
  const products = await Product.find({}).lean();
  const settings = (await SiteSettings.findOne({}).lean()) || {};
  await mongoose.disconnect();

  if (scheduled) {
    const same = sameAsNewest(products, settings);
    if (same) {
      console.log(`nothing changed since snapshot ${same} — no new snapshot`);
      pruneWeekly();
      return;
    }
  }

  const name = stamp() + (label ? `-${label}` : "");
  fs.mkdirSync(DIR, { recursive: true });
  const file = path.join(DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify({ takenAt: new Date().toISOString(), label: label || null, products, settings }, null, 1));
  const hidden = products.filter((p) => p.isActive === false).length;
  console.log(`snapshot ${name}: ${products.length} products (${hidden} hidden), settings ${Object.keys(settings).length ? "included" : "empty"}`);
  console.log(`→ ${path.relative(path.join(__dirname, "..", ".."), file)}`);
  if (scheduled) pruneWeekly();
  // for the workflow's commit message
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `name=${name}\n`);
};

module.exports = { sameAsNewest, pruneWeekly, snapshotFiles, DIR, KEEP_WEEKLY };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
