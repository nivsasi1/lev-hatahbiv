const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, required: true },
        price: { type: String, trim: true, required: true },
        salePercentage : { type: Number, trim: true},
        quantity: { type: Number, trim: true},
        isAvailable: {type: Boolean, default: true},
        description: { type: String, trim: true},
        category: { type: String, trim: true, required: true },
        sub_cat: { type: String, trim: true },
        third_level: { type: String, trim: true },
        img: { type: String, trim: true, unique: true, required: true }
    }
)

module.exports = mongoose.model("Product", ProductSchema);
