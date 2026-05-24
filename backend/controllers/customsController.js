const { getReadContract, getWriteContract } = require("../config/contract");
const { safeContractCall } = require("../utils/contractErrors");
const Record = require("../models/Record");
const saveRecord = require("../utils/saveRecord");
const { ethers } = require("ethers");

const EXPORT_DOC_TYPES = ["CommercialInvoice", "PackingList", "BillOfLading", "CertificateOfOrigin"];

/**
 * POST /api/customs/export-verify/:shipId
 * Export customs authority verifies all 4 export documents are submitted.
 * On success, sets shipment status to ExportCleared.
 */
async function verifyExportDocuments(req, res, next) {
  try {
    const { shipId } = req.params;
    const privateKey = req.body.privateKey || process.env.EXPORT_CUSTOMS_PRIVATE_KEY;

    if (!shipId || !privateKey) {
      return res.status(400).json({
        success: false,
        error: "shipId and privateKey (or backend key) are required",
      });
    }

    const shipIdBig = BigInt(shipId);

    const contract = getWriteContract(privateKey);
    const result = await safeContractCall({
      contract,
      method: "expVerify",
      args: [shipIdBig],
      context: "verifyExportDocuments",
      res,
    });
    if (!result) return;

    const { receipt } = result;

    await saveRecord("EXPORT_CLEARED", receipt, {
      shipId: String(shipId),
      clearedBy: receipt.from,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      message: `Shipment ${shipId} export documents verified and cleared.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/customs/import-verify/:shipId
 * Import customs authority clears shipment for import.
 */
async function verifyImportDocuments(req, res, next) {
  try {
    const { shipId } = req.params;
    const privateKey = req.body.privateKey || process.env.IMPORT_CUSTOMS_PRIVATE_KEY;

    if (!shipId || !privateKey) {
      return res.status(400).json({
        success: false,
        error: "shipId and privateKey (or backend key) are required",
      });
    }

    const shipIdBig = BigInt(shipId);

    const contract = getWriteContract(privateKey);
    const result = await safeContractCall({
      contract,
      method: "impVerify",
      args: [shipIdBig],
      context: "verifyImportDocuments",
      res,
    });
    if (!result) return;

    const { receipt } = result;

    await saveRecord("IMPORT_CLEARED", receipt, {
      shipId: String(shipId),
      clearedBy: receipt.from,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      message: `Shipment ${shipId} import cleared.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/customs/export-docs/:shipId
 * View all hashed export documents for a shipment.
 * Accessible by export customs authority.
 * Returns array of 4 document types with their hashes (if uploaded).
 */
async function getExportDocuments(req, res, next) {
  try {
    const { shipId } = req.params;

    if (!shipId) {
      return res.status(400).json({
        success: false,
        error: "shipId is required",
      });
    }

    const contract = getReadContract();

    // Get shipment details
    const shipment = await contract.shipments(BigInt(shipId));
    if (!shipment.shipId || shipment.shipId === 0n) {
      return res.status(404).json({
        success: false,
        error: `Shipment ${shipId} not found`,
      });
    }

    // Get export docs from mapping
    const exportDocs = await contract.exportDocs(BigInt(shipId));

    // Get order info
    const order = await contract.orders(shipment.Orderid);

    // Fetch IPFS records from database for CIDs
    const records = await Record.find({
      recordType: "EXPORT_DOC_UPLOADED",
      "rawData.shipId": String(shipId),
    }).sort({ createdAt: -1 });

    const docDetails = EXPORT_DOC_TYPES.map((docType, index) => {
      const hashField = [
        "commercialInvoiceHash",
        "packingListHash",
        "billOfLadingHash",
        "certificateOfOriginHash",
      ][index];

      const docHash = exportDocs[hashField];
      const hashedRecord = records.find((r) => r.rawData.docType === docType);

      return {
        docType,
        index,
        docHash: docHash !== ethers.ZeroHash ? docHash : null,
        cid: hashedRecord ? hashedRecord.rawData.cid : null,
        uploaded: docHash !== ethers.ZeroHash,
        uploadedAt: hashedRecord ? hashedRecord.createdAt : null,
      };
    });

    const isExportReady = await contract.isExportReady(BigInt(shipId));

    res.json({
      success: true,
      shipId: String(shipId),
      shipment: {
        status: Number(shipment.status),
        freightForwarder: shipment.freightForwarder,
        orderId: String(shipment.Orderid),
      },
      order: {
        seller: order.selleradd,
        buyer: order.buyeradd,
        escrowed: String(order.escrowed),
      },
      exportDocs: docDetails,
      uploadedCount: Number(exportDocs.uploadedCount),
      isExportReady,
      docTypes: {
        0: "CommercialInvoice",
        1: "PackingList",
        2: "BillOfLading",
        3: "CertificateOfOrigin",
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/customs/shipments
 * List all shipments with their export document status.
 * Useful for customs dashboard to see pending verifications.
 */
async function getShipmentsList(req, res, next) {
  try {
    const contract = getReadContract();

    // Fetch all records of type SHIPMENT_REQUESTED or EXPORT_DOC_UPLOADED
    const shipmentRecords = await Record.find({
      recordType: { $in: ["SHIPMENT_REQUESTED", "EXPORT_DOC_UPLOADED"] },
    }).sort({ createdAt: -1 });

    // Group by shipId
    const shipmentMap = new Map();

    for (const record of shipmentRecords) {
      const shipId = record.rawData.shipId || String(record.rawData.shipId);
      if (!shipmentMap.has(shipId)) {
        shipmentMap.set(shipId, {
          shipId,
          docsUploaded: [],
          createdAt: record.createdAt,
        });
      }

      const entry = shipmentMap.get(shipId);
      if (record.recordType === "EXPORT_DOC_UPLOADED") {
        entry.docsUploaded.push(record.rawData.docType);
      }
    }

    const shipments = Array.from(shipmentMap.values())
      .map((ship) => ({
        ...ship,
        uploadedCount: ship.docsUploaded.length,
        isReady: ship.docsUploaded.length >= 4,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);

    res.json({
      success: true,
      shipments: shipments.slice(0, 50), // Limit to 50 recent
      total: shipments.length,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  verifyExportDocuments,
  verifyImportDocuments,
  getExportDocuments,
  getShipmentsList,
};
