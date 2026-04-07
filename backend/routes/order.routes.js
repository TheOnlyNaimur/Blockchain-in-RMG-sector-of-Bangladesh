const express = require("express");
const { createOrder, acceptOrder, confirmDelivery, forceRelease, payOrder, getOrders } = require("../controllers/orderController");

const router = express.Router();

// GET  /api/orders                   — returns fully hydrated order states
router.get("/", getOrders);

// POST /api/orders            — seller creates an order
router.post("/", createOrder);

// POST /api/orders/:orderId/accept           — buyer accepts
router.post("/:orderId/accept", acceptOrder);

// POST /api/orders/:orderId/confirm-delivery — buyer confirms goods received → releases escrow
router.post("/:orderId/confirm-delivery", confirmDelivery);

// POST /api/orders/:orderId/force-release    — import customs force-releases escrow
router.post("/:orderId/force-release", forceRelease);

// POST /api/orders/:orderId/pay              — buyer pays after delivery
router.post("/:orderId/pay", payOrder);

module.exports = router;
