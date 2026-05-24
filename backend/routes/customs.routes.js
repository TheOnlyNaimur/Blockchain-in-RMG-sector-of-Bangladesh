const express = require("express");
const {
  verifyExportDocuments,
  verifyImportDocuments,
  getExportDocuments,
  getShipmentsList,
} = require("../controllers/customsController");

const router = express.Router();

/**
 * POST /api/customs/export-verify/:shipId
 * Export customs authority verifies all 4 export documents are submitted
 */
router.post("/export-verify/:shipId", verifyExportDocuments);

/**
 * POST /api/customs/import-verify/:shipId
 * Import customs authority clears shipment for import
 */
router.post("/import-verify/:shipId", verifyImportDocuments);

/**
 * GET /api/customs/export-docs/:shipId
 * View all hashed export documents for a shipment
 */
router.get("/export-docs/:shipId", getExportDocuments);

/**
 * GET /api/customs/shipments
 * List all shipments with their export document status
 */
router.get("/shipments", getShipmentsList);

module.exports = router;
