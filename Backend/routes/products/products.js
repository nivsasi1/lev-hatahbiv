const express = require("express");
const router = express.Router();
const {
    getDataBySub0Cat
} = require("../../controllers/products/products.js");


router.get("/", getDataBySub0Cat);


module.exports = router;
