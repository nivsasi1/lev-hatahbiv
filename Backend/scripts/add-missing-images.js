// Give photo-less products a photo: uploads local image files to the store's S3
// bucket and writes the stored name(s) into the product's `img`.
//
//   node scripts/add-missing-images.js <manifest.json>            → dry run
//   node scripts/add-missing-images.js <manifest.json> --apply    → upload + write
//
// manifest: [{ "id": "<product _id>", "files": ["front.jpg", "open.jpg"] }]
//   file paths are relative to the manifest; first file = primary, rest = gallery.
//
// It only ever FILLS AN EMPTY `img` — a product that already has a photo is
// skipped, so re-running (or a stale manifest) can't overwrite the manager's work.
// Take a snapshot first:  node scripts/snapshot.js before-adding-images
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const Product = require("../models/products/product.model");
const s3 = require("../helpers/s3");

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

const main = async () => {
  const manifestPath = process.argv[2];
  const apply = process.argv.includes("--apply");
  if (!manifestPath) throw new Error("usage: add-missing-images.js <manifest.json> [--apply]");
  if (!process.env.DB_URL) throw new Error("DB_URL is not set");
  if (apply && !s3.enabled()) throw new Error("AWS keys are not set — can't upload");

  const dir = path.dirname(path.resolve(manifestPath));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  await mongoose.connect(process.env.DB_URL);

  let done = 0, skipped = 0;
  for (const row of manifest) {
    const p = await Product.findById(row.id).select("name img").lean();
    if (!p) { console.log(`SKIP  ${row.id} — no such product`); skipped++; continue; }
    if (p.img && String(p.img).trim()) { console.log(`SKIP  ${p.name} — already has a photo`); skipped++; continue; }

    const files = row.files.map((f) => path.join(dir, f));
    const missing = files.find((f) => !fs.existsSync(f) || !MIME[path.extname(f).toLowerCase()]);
    if (missing) { console.log(`SKIP  ${p.name} — bad file ${missing}`); skipped++; continue; }

    if (!apply) { console.log(`WOULD ${p.name}  ←  ${row.files.join(" ; ")}`); done++; continue; }

    const names = [];
    for (const f of files) {
      names.push(await s3.uploadImage(fs.readFileSync(f), path.basename(f), MIME[path.extname(f).toLowerCase()]));
    }
    // the empty-img condition is part of the write itself, not just the check above
    const r = await Product.updateOne(
      { _id: row.id, $or: [{ img: { $exists: false } }, { img: "" }, { img: null }] },
      { $set: { img: names.join(";") } }
    );
    console.log(`${r.modifiedCount ? "OK   " : "RACE "} ${p.name}  ←  ${names.join(";")}`);
    r.modifiedCount ? done++ : skipped++;
  }

  await mongoose.disconnect();
  console.log(`\n${apply ? "applied" : "dry run"}: ${done} product(s), ${skipped} skipped`);
};

main().catch((e) => { console.error(e.message); process.exit(1); });
