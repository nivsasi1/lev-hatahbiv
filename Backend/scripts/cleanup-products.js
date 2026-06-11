// One-time cleanup: permanently delete products that have no category or a
// price of 0 (or no usable price at all). These are dead Wix-import rows the
// storefront can never sell.
//
//   node scripts/cleanup-products.js          # dry run — shows what would go
//   node scripts/cleanup-products.js --yes    # actually deletes
const mongoose = require("mongoose");
const path = require("path");
const Product = require("../models/products/product.model");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const FILTER = {
  $or: [
    { category: { $exists: false } },
    { category: { $in: [null, ""] } },
    { price: { $not: { $gt: 0 } } }, // 0, negative, missing, or non-numeric
  ],
};

(async () => {
  await mongoose.connect(process.env.DB_URL);

  const doomed = await Product.find(FILTER)
    .select("name price category")
    .lean();
  console.log(`matched ${doomed.length} products for deletion`);
  for (const p of doomed.slice(0, 10)) {
    console.log(`  - ${p.name ?? "(no name)"} | price=${p.price} | category=${p.category ?? "(none)"}`);
  }
  if (doomed.length > 10) console.log(`  ... and ${doomed.length - 10} more`);

  if (process.argv.includes("--yes")) {
    const res = await Product.deleteMany(FILTER);
    console.log(`DELETED ${res.deletedCount} products permanently`);
  } else {
    console.log("dry run only — re-run with --yes to delete");
  }

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
