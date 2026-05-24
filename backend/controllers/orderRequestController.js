const { ethers } = require("ethers");
const OrderRequest = require("../models/OrderRequest");
const { hashData } = require("../utils/crypto");
const { formatRequestID } = require("../utils/entityIds");

async function createOrderRequest(req, res, next) {
  try {
    const { data, signature, userAddress } = req.body;

    if (!data || !signature || !userAddress) {
      return res.status(400).json({
        success: false,
        error: "data, signature, and userAddress are required",
      });
    }

    const { sellerAddress, details, amount, hsCode, destination } = data;
    if (!sellerAddress || !details || !amount) {
      return res.status(400).json({
        success: false,
        error: "sellerAddress, details, and amount are required in data",
      });
    }

    if (!ethers.isAddress(sellerAddress)) {
      return res.status(400).json({ success: false, error: "Invalid seller address" });
    }

    const message = JSON.stringify(data);
    let recoveredAddress;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (err) {
      return res.status(401).json({ success: false, error: "Invalid signature" });
    }

    if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return res.status(401).json({ success: false, error: "Signature does not match user address" });
    }

    const count = await OrderRequest.countDocuments();
    const requestId = String(count + 1);
    const dataHash = hashData(data);

    const request = await OrderRequest.create({
      requestId,
      buyerAddress: userAddress.toLowerCase(),
      sellerAddress: sellerAddress.toLowerCase(),
      details,
      hsCode: hsCode || "",
      destination: destination || "",
      amount: String(amount),
      status: "pending",
      signature,
      dataHash,
    });

    res.status(201).json({
      success: true,
      requestId: request.requestId,
      requestDisplayId: formatRequestID(request.requestId),
      message: "Purchase request submitted. Awaiting seller to create on-chain order.",
      data: {
        requestId: request.requestId,
        requestDisplayId: formatRequestID(request.requestId),
        buyerAddress: request.buyerAddress,
        sellerAddress: request.sellerAddress,
        details: request.details,
        amount: request.amount,
        status: request.status,
        createdAt: request.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getOrderRequests(req, res, next) {
  try {
    const { buyerAddress, sellerAddress, status } = req.query;
    const filter = {};
    if (buyerAddress) filter.buyerAddress = buyerAddress.toLowerCase();
    if (sellerAddress) filter.sellerAddress = sellerAddress.toLowerCase();
    if (status) filter.status = status;

    const requests = await OrderRequest.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: requests.length,
      data: requests.map((r) => ({
        requestId: r.requestId,
        requestDisplayId: formatRequestID(r.requestId),
        buyerAddress: r.buyerAddress,
        sellerAddress: r.sellerAddress,
        details: r.details,
        hsCode: r.hsCode,
        destination: r.destination,
        amount: r.amount,
        status: r.status,
        orderId: r.orderId,
        poid: r.orderId ? require("../utils/entityIds").formatPOID(r.orderId) : null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

async function fulfillOrderRequest(req, res, next) {
  try {
    const { requestId } = req.params;
    const { orderId, sellerAddress } = req.body;

    if (!orderId || !sellerAddress) {
      return res.status(400).json({
        success: false,
        error: "orderId and sellerAddress are required",
      });
    }

    const request = await OrderRequest.findOne({ requestId });
    if (!request) {
      return res.status(404).json({ success: false, error: "Purchase request not found" });
    }

    if (request.sellerAddress !== sellerAddress.toLowerCase()) {
      return res.status(403).json({ success: false, error: "Only the assigned seller can fulfill this request" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ success: false, error: `Request is already ${request.status}` });
    }

    request.status = "fulfilled";
    request.orderId = String(orderId);
    await request.save();

    const { formatPOID } = require("../utils/entityIds");
    res.json({
      success: true,
      requestId: request.requestId,
      orderId: request.orderId,
      poid: formatPOID(request.orderId),
      message: "Purchase request linked to on-chain order.",
    });
  } catch (err) {
    next(err);
  }
}

async function cancelOrderRequest(req, res, next) {
  try {
    const { requestId } = req.params;
    const { userAddress } = req.body;

    const request = await OrderRequest.findOne({ requestId });
    if (!request) {
      return res.status(404).json({ success: false, error: "Purchase request not found" });
    }

    if (request.buyerAddress !== userAddress?.toLowerCase()) {
      return res.status(403).json({ success: false, error: "Only the buyer can cancel this request" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ success: false, error: `Cannot cancel request with status ${request.status}` });
    }

    request.status = "cancelled";
    await request.save();

    res.json({ success: true, message: "Purchase request cancelled." });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrderRequest,
  getOrderRequests,
  fulfillOrderRequest,
  cancelOrderRequest,
};
