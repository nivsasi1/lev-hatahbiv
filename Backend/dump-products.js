// One-off: dump all products from MongoDB to JSON so the static frontend
// catalog can be generated from real inventory.
const mongoose = require("mongoose");
const fs = require("fs");
const Product = require("./models/products/product.model");
const SiteSettings = require("./models/settings/settings.model");
require("dotenv").config({ path: ".env" });

(async () => {
  await mongoose.connect(process.env.DB_URL);
  const products = await Product.find({}).lean();
  fs.writeFileSync("products-dump.json", JSON.stringify(products, null, 2));
  console.log(`dumped ${products.length} products`);

  // Site settings singleton (homepage marquee + featured ids). The collection
  // may be empty on a fresh DB — write {} so the generator always has a file.
  const settings = await SiteSettings.findOne({}).lean();
  fs.writeFileSync("settings-dump.json", JSON.stringify(settings || {}, null, 2));
  console.log(`dumped settings (${settings ? "found" : "none"})`);

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
