const express = require("express");
const {
  registerSeller,
  approveSeller,
  getCertificateByHash,
  getSellerEvents,
} = require("../controllers/sellerController");
const { upload } = require("../config/ipfs");

const router = express.Router();

// POST /api/sellers/register
router.post("/register", registerSeller);

// POST /api/sellers/approve  (certifier only)
router.post("/approve", upload.single("certificate"), approveSeller);

// GET /api/sellers/certificates/:hash
router.get("/certificates/:hash", getCertificateByHash);

// GET  /api/sellers/events
router.get("/events", getSellerEvents);

module.exports = router;
