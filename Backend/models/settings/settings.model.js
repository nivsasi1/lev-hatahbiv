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
    // per-shelf manager picks that lead the shelf page (up to 5 product ids):
    // { "<categorySlug>/<subCategorySlug>": ["<productId>", ...] }
    shelfPicks: { type: Object, default: {} },
    // per-shelf order of the series chips (names not listed keep their place
    // after the listed ones): { "<categorySlug>/<subCategorySlug>": ["GOLDEN...", ...] }
    shelfOrder: { type: Object, default: {} },
    // NOTE: coupons + the newsletter welcome offer moved to the Cloudflare
    // Worker (D1). See worker/index.ts + worker/schema.sql.
  },
  { timestamps: true }
);

module.exports = mongoose.model("SiteSettings", SiteSettingsSchema);
