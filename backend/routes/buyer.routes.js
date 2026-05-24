const express = require("express");
const { registerBuyer, getSellerStatus } = require("../controllers/buyerController");

const router = express.Router();

// POST /api/buyers/register
router.post("/register", registerBuyer);

// GET /api/buyers/seller-status/:sellerAddress
// Buyer dashboard endpoint to view seller's public status
// Shows: approval status, compliance certification status (bool only, no sensitive data)
router.get("/seller-status/:sellerAddress", getSellerStatus);

module.exports = router;
