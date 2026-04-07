const express = require("express");
const { registerBuyer } = require("../controllers/buyerController");

const router = express.Router();

// POST /api/buyers/register
router.post("/register", registerBuyer);

module.exports = router;
