const {
  getWriteContract,
  getReadContract,
  getRoleContract,
} = require("../config/contract");
const saveRecord = require("../utils/saveRecord");
const { ethers } = require("ethers");

/**
 * POST /api/shipments
 * Body: { privateKey, batchId, freightForwarderAddress }
 * Seller requests shipment for a quality-approved batch.
 */
async function requestShipment(req, res, next) {
  try {
    const { privateKey, batchId } = req.body;
    // freightForwarderAddress defaults to the env-configured account if not supplied
    const freightForwarderAddress =
      req.body.freightForwarderAddress || process.env.FREIGHT_FORWARDER_ADDRESS;

    if (!privateKey || !batchId) {
      return res.status(400).json({
        success: false,
        error: "privateKey and batchId are required",
      });
    }

    const contract = getWriteContract(privateKey);
    const tx = await contract.shipReq(BigInt(batchId), freightForwarderAddress);
    const receipt = await tx.wait();

    // Parse ShipmentRequested event to get the new shipId
    const iface = contract.interface;
    let shipId = null;
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === "ShipmentRequested") {
          shipId = parsed.args.shipId.toString();
          break;
        }
      } catch (_) {}
    }

    await saveRecord("SHIPMENT_REQUESTED", receipt, {
      shipId,
      batchId,
      freightForwarderAddress,
      sellerAddress: new ethers.Wallet(privateKey).address,
    });

    res.status(201).json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      shipId,
      message:
        "Shipment request submitted. Freight forwarder must upload documents.",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/shipments/:shipId/doc
 * Body: { privateKey, docHash }
 * Assigned freight forwarder uploads the shipping document hash.
 */
async function uploadDocument(req, res, next) {
  try {
    const { shipId } = req.params;
    const { docHash } = req.body;
    if (!docHash) {
      return res
        .status(400)
        .json({ success: false, error: "docHash is required" });
    }

    const contract = getRoleContract("freightforwarder");
    const tx = await contract.docUpload(BigInt(shipId), docHash);
    const receipt = await tx.wait();

    await saveRecord("DOC_UPLOADED", receipt, {
      shipId,
      docHash,
      freightForwarder: process.env.FREIGHT_FORWARDER_ADDRESS,
    });

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      message: `Document uploaded for shipment #${shipId}.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/shipments/:shipId/export-verify
 * Body: { privateKey }
 * Export customs authority clears the shipment for export.
 */
async function exportVerify(req, res, next) {
  try {
    const { shipId } = req.params;

    const contract = getRoleContract("exportcustoms");
    const tx = await contract.expVerify(BigInt(shipId));
    const receipt = await tx.wait();

    await saveRecord("EXPORT_CLEARED", receipt, {
      shipId,
      authorityAddress: process.env.EXPORT_CUSTOMS_ADDRESS,
    });

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      message: `Shipment #${shipId} cleared by export customs.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/shipments/:shipId/import-verify
 * Body: { privateKey }
 * Import customs authority clears the shipment and triggers delivery confirmation.
 */
async function importVerify(req, res, next) {
  try {
    const { shipId } = req.params;

    const contract = getRoleContract("importcustoms");
    const tx = await contract.impVerify(BigInt(shipId));
    const receipt = await tx.wait();

    await saveRecord("IMPORT_CLEARED", receipt, {
      shipId,
      authorityAddress: process.env.IMPORT_CUSTOMS_ADDRESS,
    });

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      message: `Shipment #${shipId} cleared by import customs. Order marked as delivered.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/shipments/:shipId
 * Returns on-chain shipment data (from the public shipments mapping).
 */
async function getShipment(req, res, next) {
  try {
    const { shipId } = req.params;
    const contract = getReadContract();
    const s = await contract.shipments(BigInt(shipId));

    res.json({
      success: true,
      data: {
        orderId: s.Orderid.toString(),
        shipId: s.shipId.toString(),
        batchId: s.batchId.toString(),
        freightForwarder: s.freightForwarder,
        docHash: s.docHash,
        isDocUploaded: s.isDocUploaded,
        status: s.status,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/shipments
 * Returns all shipment-related events (ShipmentRequested, DocumentUploaded, CustomsCleared).
 */
async function getShipmentEvents(req, res, next) {
  try {
    const contract = getReadContract();

    const [reqEvents, docEvents, customsEvents] = await Promise.all([
      contract.queryFilter(contract.filters.ShipmentRequested(), 0, "latest"),
      contract.queryFilter(contract.filters.DocumentUploaded(), 0, "latest"),
      contract.queryFilter(contract.filters.CustomsCleared(), 0, "latest"),
    ]);

    res.json({
      success: true,
      data: {
        requested: reqEvents.map((e) => ({
          shipId: e.args.shipId.toString(),
          batchId: e.args.batchId.toString(),
          freightForwarder: e.args.freightForwarder,
          blockNumber: e.blockNumber,
          txHash: e.transactionHash,
        })),
        documentsUploaded: docEvents.map((e) => ({
          shipId: e.args.shipId.toString(),
          docHash: e.args.docHash,
          blockNumber: e.blockNumber,
          txHash: e.transactionHash,
        })),
        customsCleared: customsEvents.map((e) => ({
          shipId: e.args.shipId.toString(),
          authorityType: e.args.authorityType,
          blockNumber: e.blockNumber,
          txHash: e.transactionHash,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  requestShipment,
  uploadDocument,
  exportVerify,
  importVerify,
  getShipment,
  getShipmentEvents,
};
