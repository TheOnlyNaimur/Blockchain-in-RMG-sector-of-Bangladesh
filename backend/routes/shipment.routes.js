const express = require("express");
const {
  requestShipment,
  uploadDocument,
  exportVerify,
  importVerify,
  getShipment,
  getShipmentDocuments,
  getShipmentEvents,
} = require("../controllers/shipmentController");
const { upload } = require("../config/ipfs");

const router = express.Router();

// GET  /api/shipments/events
router.get("/events", getShipmentEvents);

// GET  /api/shipments/:shipId/docs
router.get("/:shipId/docs", getShipmentDocuments);

// GET  /api/shipments/:shipId
router.get("/:shipId", getShipment);

// POST /api/shipments                         — seller requests shipment
router.post("/", requestShipment);

// POST /api/shipments/:shipId/doc             — freight forwarder uploads docs (multipart file)
router.post("/:shipId/doc", upload.single("file"), uploadDocument);

// POST /api/shipments/:shipId/export-verify   — export customs clears
router.post("/:shipId/export-verify", exportVerify);

// POST /api/shipments/:shipId/import-verify   — import customs clears
router.post("/:shipId/import-verify", importVerify);

module.exports = router;
