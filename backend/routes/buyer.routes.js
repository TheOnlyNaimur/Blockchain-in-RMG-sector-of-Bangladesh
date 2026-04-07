const express = require("express");
const { registerBuyer, getSellerStatusForBuyer } = require("../controllers/buyerController");

const router = express.Router();

// POST /api/buyers/register
router.post("/register", registerBuyer);

// GET /api/buyers/seller-status/:sellerAddress
router.get("/seller-status/:sellerAddress", getSellerStatusForBuyer);

module.exports = router;
