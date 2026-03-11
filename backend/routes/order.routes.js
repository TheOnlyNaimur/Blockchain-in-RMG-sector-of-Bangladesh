const express = require("express");
const { createOrder, acceptOrder, payOrder, getOrderEvents } = require("../controllers/orderController");

const router = express.Router();

// POST /api/orders            — seller creates an order
router.post("/", createOrder);

// POST /api/orders/:orderId/accept  — buyer accepts
router.post("/:orderId/accept", acceptOrder);

// POST /api/orders/:orderId/pay     — buyer pays after delivery
router.post("/:orderId/pay", payOrder);

// GET  /api/orders/events
router.get("/events", getOrderEvents);

module.exports = router;
