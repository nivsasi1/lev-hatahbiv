const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const ProductSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, required: true },
        price: { type: String, trim: true, required: true },
        quantity: { type: String, trim: true},
        isAvailable: {type: Boolean, default: true},
        desc: { type: String, trim: true},
        category: { type: String, trim: true, required: true },
        sub_cat: { type: String, trim: true },
        third_level: { type: String, trim: true },
        img: { type: String, trim: true, unique: true, required: true }
    }
)

//category?name=art-colors&sub=0
//category = url.name
//subcategory = url.sub
//third = ???

module.exports = mongoose.model("Product", ProductSchema);
