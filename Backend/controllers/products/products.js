const Product = require("../../models/products/product");
const { ObjectId } = require("mongodb");


exports.getDataBySub0Cat = async (req, res) => {
    try {
        const category = req.query.category;
        const sub_cat = req.query.sub;
        let initialProducts;
        if (sub_cat == "0") {
            initialProducts = await Product.find({ category: category  });
        }
        else {
            initialProducts = await Product.find({ sub_cat: sub_cat  });
        }
        res.json({ data: initialProducts });
    } catch (err) {
        res.status(400).json({ error: true, error_message: "Error: " + err });
    }
};