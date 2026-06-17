const mongoose = require("mongoose");

// Singleton controlling the public homepage — the marquee ribbon strings and
// the list of featured product ids. Exactly one document is ever stored
// (upserted by PUT /admin/settings); the storefront reads it only at
// publish/build time via dump-products.js -> settings-dump.json.
const SiteSettingsSchema = new mongoose.Schema(
  {
    ribbonTexts: { type: [String], default: [] },
    featuredIds: { type: [String], default: [] },
    saleIds: { type: [String], default: [] },
    // homepage category-mosaic photos: { "<categorySlug>": "<imageUrl>" }
    shelfImages: { type: Object, default: {} },
    // checkout discount coupons: [{ code: "SUMMER", percent: 10 }]
    coupons: { type: [{ code: String, percent: Number, _id: false }], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SiteSettings", SiteSettingsSchema);
