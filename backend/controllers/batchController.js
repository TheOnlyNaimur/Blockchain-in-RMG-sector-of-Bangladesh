const {
  getWriteContract,
  getReadContract,
  getRoleContract,
} = require("../config/contract");
const saveRecord = require("../utils/saveRecord");
const { safeContractCall } = require("../utils/contractErrors");
const { ethers } = require("ethers");

/**
 * POST /api/batches
 */
async function createBatch(req, res, next) {
  try {
    const { data, signature, userAddress } = req.body;

    if (!data || !signature || !userAddress) {
      return res.status(400).json({ success: false, error: "data, signature, and userAddress are required" });
    }

    const { orderId, productInfo } = data;
    if (!orderId || !productInfo) {
      return res.status(400).json({ success: false, error: "orderId and productInfo are required in data" });
    }

    // Verify signature
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

    const productInfoHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({ orderId, productInfo })));
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(message));

    if (!process.env.BACKEND_PRIVATE_KEY) {
      return res.status(500).json({ success: false, error: "Backend private key not configured" });
    }

    const contract = getWriteContract(process.env.BACKEND_PRIVATE_KEY);
    const result = await safeContractCall({
      contract,
      method: "batchCreate",
      args: [userAddress, BigInt(orderId), productInfoHash],
      context: "createBatch",
      res,
    });
    if (!result) return;

    const { receipt } = result;

    // Parse BatchCreated event
    const iface = contract.interface;
    let batchId = null;
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === "BatchCreated") {
          batchId = parsed.args.batchId.toString();
          break;
        }
      } catch (_) {}
    }

    await saveRecord("BATCH_CREATED", receipt, {
      batchId,
      orderId,
      productInfo,
      sellerAddress: userAddress,
      signature,
      dataHash,
    });

    res.status(201).json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      batchId,
      message: "Batch created. Awaiting quality check.",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/batches/:batchId/quality
 */
async function qualityCheck(req, res, next) {
  try {
    const { batchId } = req.params;
    const { status } = req.body;
    if (status === undefined) {
      return res.status(400).json({ success: false, error: "status (true|false) is required" });
    }

    const privateKey = req.body.privateKey || process.env.QUALITY_CHECKER_PRIVATE_KEY;
    if (!privateKey) {
      return res.status(400).json({ success: false, error: "privateKey is required or backend not configured" });
    }

    // Pre-check: Prevent duplicate quality reviews
    try {
      const readContract = getReadContract();
      const qualityEvents = await readContract.queryFilter(
        readContract.filters.BatchQualityUpdated(),
        0,
        "latest"
      );
      const existingReview = qualityEvents.find(
        (e) => e.args.batchId.toString() === String(batchId)
      );
      if (existingReview) {
        const previousResult = existingReview.args.status ? "APPROVED" : "REJECTED";
        return res.status(409).json({
          success: false,
          error: `Batch #${batchId} has already been ${previousResult}. Quality reviews cannot be changed once recorded on the blockchain.`,
          code: "ALREADY_REVIEWED",
        });
      }
    } catch (checkErr) {
      console.error("Quality check pre-validation failed:", checkErr.message);
      // Continue — let the smart contract handle it as a fallback
    }

    const contract = getRoleContract(privateKey);
    const result = await safeContractCall({
      contract,
      method: "bqualitycheck",
      args: [BigInt(batchId), Boolean(status)],
      context: "qualityCheck",
      res,
    });
    if (!result) return;

    const { receipt } = result;

    await saveRecord("QUALITY_CHECK", receipt, {
      batchId,
      qualityPassed: Boolean(status),
      checkerAddress: process.env.QUALITY_CHECKER_ADDRESS,
    });

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      message: `Batch #${batchId} quality check: ${status ? "PASSED" : "FAILED"}.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/batches/events
 */
async function getBatchEvents(req, res, next) {
  try {
    const contract = getReadContract();

    const [createdEvents, qualityEvents, orderEvents] = await Promise.all([
      contract.queryFilter(contract.filters.BatchCreated(), 0, "latest"),
      contract.queryFilter(contract.filters.BatchQualityUpdated(), 0, "latest"),
      contract.queryFilter(contract.filters.OrderCreated(), 0, "latest"),
    ]);

    const orderSellerMap = {};
    orderEvents.forEach((e) => {
      orderSellerMap[e.args.orderId.toString()] = e.args.seller;
    });

    const Record = require("../models/Record");
    const batchRecords = await Record.find({ recordType: "BATCH_CREATED" }).lean();
    const batchInfoMap = new Map();
    batchRecords.forEach((r) => {
      if (r.rawData && r.rawData.batchId) {
        batchInfoMap.set(String(r.rawData.batchId), r.rawData.productInfo || "N/A");
      }
    });

    const created = createdEvents.map((e) => {
      const bId = e.args.batchId.toString();
      return {
        type: "BatchCreated",
        batchId: bId,
        orderId: e.args.orderId.toString(),
        seller: orderSellerMap[e.args.orderId.toString()] || null,
        productInfo: batchInfoMap.get(bId) || "N/A",
        productInfoHash: e.args.productInfoHash,
        blockNumber: e.blockNumber,
        txHash: e.transactionHash,
      };
    });

    const quality = qualityEvents.map((e) => ({
      type: "BatchQualityUpdated",
      batchId: e.args.batchId.toString(),
      status: e.args.status,
      blockNumber: e.blockNumber,
      txHash: e.transactionHash,
    }));

    res.json({ success: true, data: { created, quality } });
  } catch (err) {
    next(err);
  }
}

module.exports = { createBatch, qualityCheck, getBatchEvents };
