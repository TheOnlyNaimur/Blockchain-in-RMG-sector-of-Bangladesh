const express = require("express");
const {
  getAllRecords,
  getRecordByTxHash,
  verifyRecord,
  getRecordTypes,
} = require("../controllers/recordController");

const router = express.Router();

// GET /api/records/types                — list all recordType values + counts
router.get("/types", getRecordTypes);

// GET /api/records/verify/:txHash       — integrity check for a record
router.get("/verify/:txHash", verifyRecord);

// GET /api/records/:txHash              — single record by tx hash
router.get("/:txHash", getRecordByTxHash);

// GET /api/records?type=X&page=1&limit=20
router.get("/", getAllRecords);

module.exports = router;
