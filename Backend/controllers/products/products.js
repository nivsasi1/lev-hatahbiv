const Product = require("../../models/products/product.model");


exports.getDataBySub0Cat = async (req, res) => {
    try {
        const category = req.params.category;
        // const sub_cat = req.params.sub;
        const sub_cat = "0";
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

exports.getCategoryTree = async (req, res) => {
    categoryName = req.params.category;
    
    const result = await Product.aggregate([
        { $match: { category: categoryName } },
        { $group: {
            _id: { sub_cat: '$sub_cat', third_level: '$third_level' },
            productAmount: { $sum: 1 }
        }},
        { $group: {
            _id: '$_id.sub_cat',
            productAmount: { $sum: '$productAmount' },
            subsLength: { $sum: 1 },
            subs: {
                $push: {
                    name: '$_id.third_level',
                    productAmount: '$productAmount',
                    subs: []
                }
            }
        }},
        { $project: {
            _id: 0,
            name: '$_id',
            productAmount: 1,
            subsLength: 1,
            subs: {
                $map: {
                    input: '$subs',
                    as: 'sub',
                    in: {
                        name: '$$sub.name',
                        productAmount: '$$sub.productAmount',
                        subsLength: { $literal: 0 },
                        subs: []
                    }
                }
            }
        }},
        { $group: {
            _id: null,
            productAmount: { $sum: '$productAmount' },
            subsLength: { $sum: 1 },
            subs: {
                $push: {
                    name: '$name',
                    productAmount: '$productAmount',
                    subsLength: '$subsLength',
                    subs: '$subs'
                }
            }
        }},
        { $project: {
            _id: 0,
            name: categoryName,
            productAmount: '$productAmount',
            subsLength: '$subsLength',
            subs: {
                $map: {
                    input: '$subs',
                    as: 'sub',
                    in: {
                        name: '$$sub.name',
                        productAmount: '$$sub.productAmount',
                        subsLength: '$$sub.subsLength',
                        subs: '$$sub.subs'
                    }
                }
            }
        }}
    ]);
    
    res.json({ data: result[0] });
}