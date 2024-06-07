const express = require("express");
const router = express.Router();
const {
  getDataBySub0Cat,
  getCategoryTree,
  fetchProductById,
  fetchProductsByName,
} = require("../../controllers/products/products.js");

router.get("/getProducts/:category/:subCategory", getDataBySub0Cat);
router.get("/getTree/:category", getCategoryTree);
router.get("/product/:id", fetchProductById);
router.get("/findProducts/:name", fetchProductsByName);

module.exports = router;
