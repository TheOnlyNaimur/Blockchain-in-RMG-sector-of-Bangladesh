const express = require("express");
const sellerRoutes = require("./seller.routes");
const buyerRoutes = require("./buyer.routes");
const orderRoutes = require("./order.routes");
const batchRoutes = require("./batch.routes");
const shipmentRoutes = require("./shipment.routes");
const recordRoutes = require("./record.routes");
const ipfsRoutes = require("./ipfs.routes");
const complianceRoutes = require("./compliance.routes");
const auditRoutes = require("./audit.routes");
const { faucetUsdt } = require("../controllers/debugController");

const router = express.Router();

router.use("/sellers", sellerRoutes);
router.use("/buyers", buyerRoutes);
router.use("/orders", orderRoutes);
router.use("/batches", batchRoutes);
router.use("/shipments", shipmentRoutes);
router.use("/records", recordRoutes);
router.use("/ipfs", ipfsRoutes);
router.use("/compliance", complianceRoutes);
router.use("/audit", auditRoutes);
router.post("/debug/usdt-faucet", faucetUsdt);

module.exports = router;
