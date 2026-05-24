const express = require("express");
const { createOrder, acceptOrder, confirmDelivery, forceRelease, payOrder, getOrders } = require("../controllers/orderController");
const { createOrderRequest, getOrderRequests, fulfillOrderRequest, cancelOrderRequest } = require("../controllers/orderRequestController");

const router = express.Router();

// GET  /api/orders                   — returns fully hydrated order states
router.get("/", getOrders);

// POST /api/orders            — seller creates an order
router.post("/", createOrder);

// POST /api/orders/requests             — buyer creates a PO request (off-chain)
router.post("/requests", createOrderRequest);

// GET /api/orders/requests              — list requests filtered by buyer/seller
router.get("/requests", getOrderRequests);

// PATCH /api/orders/requests/:requestId/fulfill — seller links request to orderId
router.patch("/requests/:requestId/fulfill", fulfillOrderRequest);

// PATCH /api/orders/requests/:requestId/cancel  — buyer cancels request
router.patch("/requests/:requestId/cancel", cancelOrderRequest);

// POST /api/orders/:orderId/accept           — buyer accepts
router.post("/:orderId/accept", acceptOrder);

// POST /api/orders/:orderId/confirm-delivery — buyer confirms goods received → releases escrow
router.post("/:orderId/confirm-delivery", confirmDelivery);

// POST /api/orders/:orderId/force-release    — import customs force-releases escrow
router.post("/:orderId/force-release", forceRelease);

// POST /api/orders/:orderId/pay              — buyer pays after delivery
router.post("/:orderId/pay", payOrder);

module.exports = router;
