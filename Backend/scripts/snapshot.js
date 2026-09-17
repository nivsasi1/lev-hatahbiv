// Freeze the catalogue as it is right now: every product document and the
// settings singleton, exactly as stored, into Backend/snapshots/<name>.json.
// The ops-snapshot workflow commits that file to main, so "the state before
// the manager's edits" is a file in git that ops-restore can put back.
//
//   node scripts/snapshot.js [label]     → snapshots/2026-09-17_1030[-label].json
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

// Israel local time in the file name, so the manager can read it
const stamp = () => {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date()).reduce((o, x) => ((o[x.type] = x.value), o), {});
  return `${p.year}-${p.month}-${p.day}_${p.hour}${p.minute}`;
};

const main = async () => {
  const label = (process.argv[2] || "").trim().toLowerCase().replace(/[^a-z0-9֐-׿-]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  if (!process.env.DB_URL) throw new Error("DB_URL is not set");
  await mongoose.connect(process.env.DB_URL);
  const products = await Product.find({}).lean();
  const settings = (await SiteSettings.findOne({}).lean()) || {};
  await mongoose.disconnect();

  const name = stamp() + (label ? `-${label}` : "");
  fs.mkdirSync(DIR, { recursive: true });
  const file = path.join(DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify({ takenAt: new Date().toISOString(), label: label || null, products, settings }, null, 1));
  const hidden = products.filter((p) => p.isActive === false).length;
  console.log(`snapshot ${name}: ${products.length} products (${hidden} hidden), settings ${Object.keys(settings).length ? "included" : "empty"}`);
  console.log(`→ ${path.relative(path.join(__dirname, "..", ".."), file)}`);
  // for the workflow's commit message
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `name=${name}\n`);
};

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
