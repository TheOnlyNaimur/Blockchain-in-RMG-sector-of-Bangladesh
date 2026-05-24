const express = require("express");
const {
  getOrderTimeline,
  getFullAuditTrail,
  checkExportReadiness,
  getShipmentTimeline,
  getUnifiedAuditRecord,
} = require("../controllers/auditController");

const router = express.Router();

// GET /api/audit/trail?page=1&limit=50&eventType=...  — full audit trail
router.get("/trail", getFullAuditTrail);

// GET /api/audit/export-readiness/:shipId             — export readiness check
router.get("/export-readiness/:shipId", checkExportReadiness);

// GET /api/audit/timeline/shipment/:shipId            — shipment lifecycle timeline
router.get("/timeline/shipment/:shipId", getShipmentTimeline);

// GET /api/audit/timeline/:orderId                    — order lifecycle timeline
router.get("/timeline/:orderId", getOrderTimeline);

// GET /api/audit/record/:id                           — unified record search (PO/BATCH/SHIP/CERT/DOC/TX)
router.get("/record/:id", getUnifiedAuditRecord);

module.exports = router;
