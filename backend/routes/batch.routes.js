const express = require("express");
const {
  createBatch,
  qualityCheck,
  getBatchEvents,
} = require("../controllers/batchController");

const router = express.Router();

// POST /api/batches                    — seller creates a production batch
router.post("/", createBatch);

// POST /api/batches/:batchId/quality   — quality checker approves/rejects
router.post("/:batchId/quality", qualityCheck);

// GET  /api/batches/events
router.get("/events", getBatchEvents);

module.exports = router;
