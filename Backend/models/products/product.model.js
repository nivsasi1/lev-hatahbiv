const mongoose = require("mongoose");

// Matches the real shape of documents in LevHatahbivDB (Wix-imported rows
// carry extra legacy fields — strict mode leaves them untouched on update).
const ProductSchema = new mongoose.Schema({
  name: { type: String, trim: true, required: true },
  price: { type: Number, required: true, min: 0 },
  // 0 = not on sale. The storefront computes the discounted price from this.
  salePercentage: { type: Number, default: 0, min: 0, max: 95 },
  quantity: { type: Number },
  // in stock? false = shown greyed-out as "אזל מהמלאי"
  isAvailable: { type: Boolean, default: true },
  // excluded from coupon discounts (welcome coupon included) — the shopper sees
  // "לא משתתף בהנחות קופון" and the checkout skips it in the discount math
  noCoupon: { type: Boolean },
  // visible to the public at all? false = soft-deleted (hidden everywhere)
  isActive: { type: Boolean, default: true },
  description: { type: String, trim: true, default: "" },
  category: { type: String, trim: true, required: true },
  sub_cat: { type: String, trim: true, default: "כללי" },
  third_level: { type: String, trim: true, default: "כללי" },
  // S3 filename, or a full URL, or "/uploads/<file>" for locally-uploaded images
  img: { type: String, trim: true, required: true },
  // selectable options (size/color/quantity) — synced from Wix or edited in the
  // dashboard. A variant without its own price costs the product's base price.
  variantLabel: { type: String, trim: true },
  variants: {
    type: [
      new mongoose.Schema(
        {
          key: { type: String, trim: true, required: true },
          price: { type: Number, min: 0 },
          soldOut: { type: Boolean },
          swatch: { type: String, trim: true }, // CSS color for color choices
        },
        { _id: false }
      ),
    ],
    default: undefined,
  },
  // legacy Wix-import fields we still read (not written by the dashboard)
  visible: { type: Boolean },
  discountMode: { type: String },
  discountValue: { type: Number },
  ribbon: { type: String },
  sku: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("Product", ProductSchema);
