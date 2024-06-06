const express = require("express");
const router = express.Router();
const {
  getDataBySub0Cat,
  getCategoryTree,
  fetchProductById,
} = require("../../controllers/products/products.js");

router.get("/getProducts/:category", getDataBySub0Cat);
router.get("/getTree/:category", getCategoryTree);
router.get("/product/:id", fetchProductById);

module.exports = router;
