const {
  getWriteContract,
  getReadContract,
  getRoleContract,
} = require("../config/contract");
const saveRecord = require("../utils/saveRecord");
const { ethers } = require("ethers");

/**
 * POST /api/batches
 * Body: { privateKey, orderId, productInfo }
 * Seller/manufacturer records a production batch linked to an accepted order.
 */
async function createBatch(req, res, next) {
  try {
    const { privateKey, orderId, productInfo } = req.body;
    if (!privateKey || !orderId || !productInfo) {
      return res.status(400).json({
        success: false,
        error: "privateKey, orderId and productInfo are required",
      });
    }

    const contract = getWriteContract(privateKey);
    const tx = await contract.batchCreate(BigInt(orderId), productInfo);
    const receipt = await tx.wait();

    // Parse BatchCreated event to get the new batchId
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
      sellerAddress: new ethers.Wallet(privateKey).address,
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
 * Body: { privateKey, status }  (status: true = pass, false = fail)
 * Quality checker verifies the batch production.
 */
async function qualityCheck(req, res, next) {
  try {
    const { batchId } = req.params;
    const { status } = req.body;
    if (status === undefined) {
      return res.status(400).json({
        success: false,
        error: "status (true|false) is required",
      });
    }

    const contract = getRoleContract("qualitychecker");
    const tx = await contract.bqualitycheck(BigInt(batchId), Boolean(status));
    const receipt = await tx.wait();

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
 * Returns all BatchCreated and BatchQualityUpdated events.
 */
async function getBatchEvents(req, res, next) {
  try {
    const contract = getReadContract();

    const [createdEvents, qualityEvents] = await Promise.all([
      contract.queryFilter(contract.filters.BatchCreated(), 0, "latest"),
      contract.queryFilter(contract.filters.BatchQualityUpdated(), 0, "latest"),
    ]);

    const created = createdEvents.map((e) => ({
      type: "BatchCreated",
      batchId: e.args.batchId.toString(),
      orderId: e.args.orderId.toString(),
      productInfo: e.args.productInfo,
      blockNumber: e.blockNumber,
      txHash: e.transactionHash,
    }));

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
