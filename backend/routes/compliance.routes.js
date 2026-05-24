const express = require("express");
const { upload } = require("../config/ipfs");
const {
  uploadCertificate,
  issueCompliance,
  revokeCompliance,
  getSellerComplianceStatus,
  getComplianceEvents,
} = require("../controllers/complianceController");

const router = express.Router();

// GET  /api/compliance/events              — all compliance events
router.get("/events", getComplianceEvents);

// GET  /api/compliance/:sellerAddress      — compliance status for a seller
router.get("/:sellerAddress", getSellerComplianceStatus);

// POST /api/compliance/issue               — issue a compliance certificate
router.post("/issue", issueCompliance);

// POST /api/compliance/upload-certificate/:sellerAddress — upload and issue certificate with file
router.post("/upload-certificate/:sellerAddress", upload.single("file"), uploadCertificate);

// POST /api/compliance/revoke              — revoke a compliance certificate
router.post("/revoke", revokeCompliance);

module.exports = router;
