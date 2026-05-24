const express = require("express");
const { revokeAccess, restoreAccess, listRevocations } = require("../controllers/accessController");

const router = express.Router();

router.get("/", listRevocations);
router.post("/revoke", revokeAccess);
router.post("/restore", restoreAccess);

module.exports = router;
