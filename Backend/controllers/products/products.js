const Product = require("../../models/products/product.model");


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

exports.getCategoryTree = async (req, res) => {
    categoryName = req.query.category;
    
    const result = await Product.aggregate([
        { $match: { category: categoryName } },
        { $group: {
            _id: { sub_cat: '$sub_cat', third_level: '$third_level' },
            subAmount: { $sum: 1 }
        }},
        { $group: {
            _id: '$_id.sub_cat',
            subAmount: { $sum: '$subAmount' },
            subsLength: { $sum: 1 },
            subs: {
                $push: {
                    name: '$_id.third_level',
                    subAmount: '$subAmount',
                    subs: []
                }
            }
        }},
        { $project: {
            _id: 0,
            name: '$_id',
            subAmount: 1,
            subsLength: 1,
            subs: {
                $map: {
                    input: '$subs',
                    as: 'sub',
                    in: {
                        name: '$$sub.name',
                        subAmount: '$$sub.subAmount',
                        subsLength: { $literal: 0 },
                        subs: []
                    }
                }
            }
        }},
        { $group: {
            _id: null,
            subAmount: { $sum: '$subAmount' },
            subsLength: { $sum: 1 },
            subs: {
                $push: {
                    name: '$name',
                    subAmount: '$subAmount',
                    subsLength: '$subsLength',
                    subs: '$subs'
                }
            }
        }},
        { $project: {
            _id: 0,
            name: categoryName,
            subAmount: '$subAmount',
            subsLength: '$subsLength',
            subs: {
                $map: {
                    input: '$subs',
                    as: 'sub',
                    in: {
                        name: '$$sub.name',
                        subAmount: '$$sub.subAmount',
                        subsLength: '$$sub.subsLength',
                        subs: '$$sub.subs'
                    }
                }
            }
        }}
    ]);
    
    res.json({ data: result[0] });
}