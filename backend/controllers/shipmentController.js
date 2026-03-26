const {
  getWriteContract,
  getReadContract,
  getRoleContract,
} = require("../config/contract");
const saveRecord = require("../utils/saveRecord");
const { ethers } = require("ethers");

/**
 * POST /api/shipments
 * Body: { data, signature, userAddress }
 * data: { batchId, freightForwarderAddress }
 * Seller requests shipment for a quality-approved batch (verified via signature).
 */
async function requestShipment(req, res, next) {
  try {
    const { data, signature, userAddress } = req.body;

    if (!data || !signature || !userAddress) {
      return res.status(400).json({
        success: false,
        error: "data, signature, and userAddress are required",
      });
    }

    const { batchId } = data;
    const freightForwarderAddress =
      data.freightForwarderAddress || process.env.FREIGHT_FORWARDER_ADDRESS;

    if (!batchId) {
      return res.status(400).json({
        success: false,
        error: "batchId is required in data",
      });
    }

    // Step 1: Verify signature
    const message = JSON.stringify(data);
    let recoveredAddress;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: "Invalid signature",
      });
    }

    if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return res.status(401).json({
        success: false,
        error: "Signature does not match user address",
      });
    }

    // Step 2: Hash the data
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(message));

    // Step 3: Call contract with backend private key
    if (!process.env.BACKEND_PRIVATE_KEY) {
      return res.status(500).json({
        success: false,
        error: "Backend private key not configured",
      });
    }

    const contract = getWriteContract(process.env.BACKEND_PRIVATE_KEY);
    const tx = await contract.shipReq(userAddress, BigInt(batchId), freightForwarderAddress);
    const receipt = await tx.wait(1, 60000);

    if (!receipt || receipt.status !== 1) {
      return res.status(500).json({
        success: false,
        error: "Transaction failed or reverted",
      });
    }

    // Step 5: Parse event and save record
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
      sellerAddress: userAddress,
      signature,
      dataHash,
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
 * Expects multipart/form-data with:
 *   - file: the document (PDF/image)
 *   - privateKey: freight forwarder's private key
 *   - docType: 0=CommercialInvoice, 1=PackingList, 2=BillOfLading, 3=CertificateOfOrigin
 *
 * Flow:
 * 1. Upload file to IPFS via Pinata → get CID
 * 2. Hash the CID → docHash (bytes32)
 * 3. Call contract.uploadExportDoc(shipId, docType, docHash) on-chain
 * 4. Save CID + metadata + docHash to MongoDB
 */
async function uploadDocument(req, res, next) {
  try {
    const { shipId } = req.params;
    const { docType } = req.body;

    const DOC_TYPES = ["CommercialInvoice", "PackingList", "BillOfLading", "CertificateOfOrigin"];

    const privateKey = req.body.privateKey || process.env.FREIGHT_FORWARDER_PRIVATE_KEY;

    if (!privateKey) {
      return res.status(400).json({
        success: false,
        error: "privateKey is required or backend not configured",
      });
    }

    const docTypeNum = Number(docType);
    if (isNaN(docTypeNum) || docTypeNum < 0 || docTypeNum > 3) {
      return res.status(400).json({
        success: false,
        error: "docType is required: 0=CommercialInvoice, 1=PackingList, 2=BillOfLading, 3=CertificateOfOrigin",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file provided. Use multipart/form-data with field 'file'",
      });
    }

    // Step 1: Upload file to IPFS
    const { Readable } = require("stream");
    const { uploadToIPFS } = require("../utils/ipfs");

    const stream = Readable.from(req.file.buffer);
    stream.path = req.file.originalname;

    const ipfsResult = await uploadToIPFS(stream, req.file.originalname, {
      shipId: String(shipId),
      docType: DOC_TYPES[docTypeNum],
      mimeType: req.file.mimetype,
    });

    // Step 2: Hash the CID for on-chain storage
    const docHash = ethers.keccak256(ethers.toUtf8Bytes(ipfsResult.cid));

    // Step 3: Call contract with freight forwarder's private key
    const contract = getRoleContract(privateKey);
    const tx = await contract.uploadExportDoc(BigInt(shipId), docTypeNum, docHash);
    const receipt = await tx.wait();

    // Step 4: Save to MongoDB with CID reference
    await saveRecord("EXPORT_DOC_UPLOADED", receipt, {
      shipId,
      docType: DOC_TYPES[docTypeNum],
      docTypeId: docTypeNum,
      docHash,
      ipfsCid: ipfsResult.cid,
      ipfsUrl: ipfsResult.ipfsUrl,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      freightForwarder: process.env.FREIGHT_FORWARDER_ADDRESS,
    });

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      docType: DOC_TYPES[docTypeNum],
      ipfsCid: ipfsResult.cid,
      ipfsUrl: ipfsResult.ipfsUrl,
      message: `${DOC_TYPES[docTypeNum]} uploaded to IPFS and hash stored on-chain for shipment #${shipId}.`,
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
    const privateKey = req.body.privateKey || process.env.EXPORT_CUSTOMS_PRIVATE_KEY;
    if (!privateKey) {
      return res.status(400).json({
        success: false,
        error: "privateKey is required or backend not configured",
      });
    }

    const contract = getRoleContract(privateKey);
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
    const privateKey = req.body.privateKey || process.env.IMPORT_CUSTOMS_PRIVATE_KEY;
    if (!privateKey) {
      return res.status(400).json({
        success: false,
        error: "privateKey is required or backend not configured",
      });
    }

    const contract = getRoleContract(privateKey);
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
 * GET /api/shipments/events
 * Returns unified shipments aggregated from MongoDB records (SHIPMENT_REQUESTED, EXPORT_DOC_UPLOADED, EXPORT_CLEARED, IMPORT_CLEARED)
 */
async function getShipmentEvents(req, res, next) {
  try {
    const Record = require("../models/Record");
    const records = await Record.find({
      recordType: {
        $in: [
          "SHIPMENT_REQUESTED",
          "EXPORT_DOC_UPLOADED",
          "EXPORT_CLEARED",
          "IMPORT_CLEARED",
        ],
      },
    }).sort({ createdAt: 1 });

    const shipmentsMap = new Map();

    records.forEach((r) => {
      const data = r.rawData;
      if (r.recordType === "SHIPMENT_REQUESTED") {
        shipmentsMap.set(data.shipId, {
          id: data.shipId,
          orderId: data.orderId || "1",
          batchId: data.batchId,
          freightForwarder: data.freightForwarder,
          shipStatus: "Requested",
          shipColor: "blue",
          docStatus: "Pending Upload",
          docColor: "yellow",
          icon: "local_shipping",
          iconBg: "bg-primary/10 text-primary",
          docs: [],
          timeline: [{ status: "Requested", date: r.createdAt }],
        });
      } else if (shipmentsMap.has(data.shipId)) {
        const shipment = shipmentsMap.get(data.shipId);
        
        if (r.recordType === "EXPORT_DOC_UPLOADED") {
          shipment.docs.push({
            type: data.docType,
            hash: data.docHash,
            url: data.ipfsUrl,
            name: data.fileName,
          });
          shipment.docStatus = `${shipment.docs.length} Docs Uploaded`;
          shipment.docColor = "blue";
          shipment.timeline.push({ status: `Doc: ${data.docType}`, date: r.createdAt });
        } else if (r.recordType === "EXPORT_CLEARED") {
          shipment.shipStatus = "Export Cleared";
          shipment.shipColor = "green";
          shipment.docStatus = "Verified";
          shipment.docColor = "green";
          shipment.icon = "fact_check";
          shipment.iconBg = "bg-green-500/10 text-green-500";
          shipment.timeline.push({ status: "Export Cleared", date: r.createdAt });
        } else if (r.recordType === "IMPORT_CLEARED") {
          shipment.shipStatus = "Import Cleared";
          shipment.shipColor = "purple";
          shipment.icon = "warehouse";
          shipment.iconBg = "bg-purple-500/10 text-purple-500";
          shipment.timeline.push({ status: "Import Cleared", date: r.createdAt });
        }
      }
    });

    res.json({
      success: true,
      count: shipmentsMap.size,
      data: Array.from(shipmentsMap.values()).reverse()
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
