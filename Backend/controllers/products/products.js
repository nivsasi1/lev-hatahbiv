const Product = require("../../models/products/product.model");

exports.getDataBySub0Cat = async (req, res) => {
  try {
    const { category, subCategory } = req.params;
    //as of now sub_cat is not used, so the value is hardcoded to 0
    const sub_cat = "0";
    let initialProducts;
    if (sub_cat == "0") {
      initialProducts = await Product.find({ category: category });
    } else {
      initialProducts = await Product.find({ sub_cat: sub_cat });
    }
    res.status(200).json({ data: initialProducts });
  } catch (err) {
    res.status(400).json({ error: true, error_message: "Error: " + err });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(200).json({ data: newProduct });
  } catch (err) {
    res.status(400).json({ error: true, error_message: "Error: " + err });
  }
};

exports.fetchProductById = async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Product.findById(id);
    res.json({ data: product });
  } catch (err) {}
};

exports.fetchProductsByName = async (req, res) => {
  try {
    const name = req.params.name;
    const searchWords = name.split(" ");
    let products = [];

    for (const word of searchWords) {
      const wordProducts = await Product.find({
        name: { $regex: word, $options: "i" },
      });
      if (products.length === 0) {
        products = wordProducts;
      } else {
        // Find the intersection of products for each word
        products = products.filter((product) =>
          wordProducts.some((wp) => wp._id.equals(product._id))
        );
      }
    }
    res.status(200).json({ data: products });
  } catch (err) {
    res.status(400).json({ error: true, error_message: "Error: " + err });
  }
};

exports.getCategoryTree = async (req, res) => {
  categoryName = req.params.category;

  const result = await Product.aggregate([
    { $match: { category: categoryName } },
    {
      $group: {
        _id: { sub_cat: "$sub_cat", third_level: "$third_level" },
        productAmount: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.sub_cat",
        productAmount: { $sum: "$productAmount" },
        subsLength: { $sum: 1 },
        subs: {
          $push: {
            name: "$_id.third_level",
            productAmount: "$productAmount",
            subs: [],
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        name: "$_id",
        productAmount: 1,
        subsLength: 1,
        subs: {
          $map: {
            input: "$subs",
            as: "sub",
            in: {
              name: "$$sub.name",
              productAmount: "$$sub.productAmount",
              subsLength: { $literal: 0 },
              subs: [],
            },
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        productAmount: { $sum: "$productAmount" },
        subsLength: { $sum: 1 },
        subs: {
          $push: {
            name: "$name",
            productAmount: "$productAmount",
            subsLength: "$subsLength",
            subs: "$subs",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        name: categoryName,
        productAmount: "$productAmount",
        subsLength: "$subsLength",
        subs: {
          $map: {
            input: "$subs",
            as: "sub",
            in: {
              name: "$$sub.name",
              productAmount: "$$sub.productAmount",
              subsLength: "$$sub.subsLength",
              subs: "$$sub.subs",
            },
          },
        },
      },
    },
  ]);
  console.log(result[0]);
  res.status(200).json({ data: result[0] });
};
