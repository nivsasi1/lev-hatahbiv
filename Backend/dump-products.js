// One-off: dump all products from MongoDB to JSON so the static frontend
// catalog can be generated from real inventory.
const mongoose = require("mongoose");
const fs = require("fs");
const Product = require("./models/products/product.model");
require("dotenv").config({ path: ".env" });

(async () => {
  await mongoose.connect(process.env.DB_URL);
  const products = await Product.find({}).lean();
  fs.writeFileSync("products-dump.json", JSON.stringify(products, null, 2));
  console.log(`dumped ${products.length} products`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
