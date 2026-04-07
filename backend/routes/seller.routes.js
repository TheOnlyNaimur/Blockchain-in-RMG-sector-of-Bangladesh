const express = require("express");
const {
  registerSeller,
  approveSeller,
  getSellerEvents,
} = require("../controllers/sellerController");

const router = express.Router();

// POST /api/sellers/register
router.post("/register", registerSeller);

// POST /api/sellers/approve  (certifier only)
router.post("/approve", approveSeller);

// GET  /api/sellers/events
router.get("/events", getSellerEvents);

module.exports = router;
