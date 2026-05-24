const { getReadContract } = require("../config/contract");
const { formatPOID, formatShipID, parseEntityId } = require("../utils/entityIds");
const Record = require("../models/Record");

/**
 * GET /api/audit/timeline/:orderId
 *
 * Queries ALL TraceEvent logs filtered by orderId to build a complete
 * chronological timeline of an order's lifecycle.
 *
 * This is the core TRACEABILITY feature — every action from order creation
 * to payment release is captured as an immutable on-chain event.
 */
async function getOrderTimeline(req, res, next) {
  try {
    const { orderId } = req.params;

    if (!orderId || isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        error: "Valid orderId is required",
      });
    }

    const contract = getReadContract();

    // Query TraceEvent filtered by orderId (first indexed param)
    const filter = contract.filters.TraceEvent(BigInt(orderId));
    const events = await contract.queryFilter(filter);

    const timeline = events.map((e) => ({
      eventType: e.args.eventType,
      actor: e.args.actor,
      timestamp: Number(e.args.timestamp),
      date: new Date(Number(e.args.timestamp) * 1000).toISOString(),
      dataHash: e.args.dataHash,
      blockNumber: e.blockNumber,
      txHash: e.transactionHash,
    }));

    // Sort by timestamp (should already be in order)
    timeline.sort((a, b) => a.timestamp - b.timestamp);

    // Optional enrichment from MongoDB records (batchId, shipId, doc uploads)
    const relatedRecords = await Record.find({
      "rawData.orderId": String(orderId),
    }).sort({ createdAt: 1 });

    const batchIds = Array.from(
      new Set(relatedRecords.map((r) => r.rawData?.batchId).filter(Boolean).map(String)),
    );
    const shipIds = Array.from(
      new Set(relatedRecords.map((r) => r.rawData?.shipId).filter(Boolean).map(String)),
    );

    res.json({
      success: true,
      orderId: Number(orderId),
      poid: formatPOID(orderId),
      eventCount: timeline.length,
      timeline,
      related: {
        batchIds,
        shipIds,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/audit/timeline/shipment/:shipId
 * Timeline for shipment activities (resolved via on-chain shipment → orderId).
 */
async function getShipmentTimeline(req, res, next) {
  try {
    const { shipId } = req.params;
    if (!shipId || isNaN(shipId)) {
      return res.status(400).json({ success: false, error: "Valid shipId is required" });
    }

    const contract = getReadContract();
    const shipment = await contract.shipments(BigInt(shipId));
    const orderId = shipment.Orderid?.toString?.() || shipment[0]?.toString?.() || null;
    if (!orderId || orderId === "0") {
      return res.status(404).json({ success: false, error: "Shipment not found on-chain" });
    }

    const filter = contract.filters.TraceEvent(BigInt(orderId));
    const events = await contract.queryFilter(filter);

    const timeline = events
      .map((e) => ({
        orderId: Number(e.args.orderId),
        eventType: e.args.eventType,
        actor: e.args.actor,
        timestamp: Number(e.args.timestamp),
        date: new Date(Number(e.args.timestamp) * 1000).toISOString(),
        dataHash: e.args.dataHash,
        blockNumber: e.blockNumber,
        txHash: e.transactionHash,
      }))
      .filter((e) =>
        ["SHIPMENT_REQUESTED", "EXPORT_DOC_UPLOADED", "EXPORT_CLEARED", "IMPORT_CLEARED"].includes(e.eventType),
      );

    timeline.sort((a, b) => a.timestamp - b.timestamp);

    res.json({
      success: true,
      shipId: Number(shipId),
      shipDisplayId: formatShipID(shipId),
      orderId: Number(orderId),
      poid: formatPOID(orderId),
      eventCount: timeline.length,
      timeline,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/audit/record/:id
 * Unified lookup for PO/BATCH/SHIP/CERT/DOC or txHash.
 */
async function getUnifiedAuditRecord(req, res, next) {
  try {
    const { id } = req.params;
    const parsed = parseEntityId(id);
    if (!parsed) return res.status(400).json({ success: false, error: "Valid id is required" });

    // Fast path for tx hashes
    if (parsed.type === "TX") {
      const record = await Record.findOne({ txHash: parsed.rawId });
      if (!record) return res.status(404).json({ success: false, error: "Record not found" });
      return res.json({ success: true, type: "TX", data: record });
    }

    // For numeric entities, search by enriched IDs or raw fields.
    const query = { $or: [] };
    if (parsed.type === "PO") {
      query.$or.push({ "rawData.orderId": String(parsed.rawId) }, { "rawData.poid": parsed.displayId.toUpperCase() });
    } else if (parsed.type === "BATCH") {
      query.$or.push({ "rawData.batchId": String(parsed.rawId) }, { "rawData.batchDisplayId": parsed.displayId.toUpperCase() });
    } else if (parsed.type === "SHIP") {
      query.$or.push({ "rawData.shipId": String(parsed.rawId) }, { "rawData.shipDisplayId": parsed.displayId.toUpperCase() });
    } else if (parsed.type === "CERT") {
      query.$or.push({ "rawData.certId": parsed.displayId });
    } else if (parsed.type === "DOC") {
      query.$or.push({ "rawData.docId": parsed.displayId });
    } else {
      query.$or.push({ txHash: parsed.rawId }, { "rawData.poid": parsed.rawId }, { "rawData.shipDisplayId": parsed.rawId });
    }

    const records = await Record.find(query).sort({ createdAt: 1 }).limit(200);
    res.json({
      success: true,
      parsed,
      count: records.length,
      records,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/audit/trail?page=1&limit=50
 *
 * Returns ALL TraceEvent logs (paginated) for full system audit.
 * Supports filtering by eventType query param.
 */
async function getFullAuditTrail(req, res, next) {
  try {
    const { page = 1, limit = 50, eventType } = req.query;
    const contract = getReadContract();

    // Get all TraceEvents
    const filter = contract.filters.TraceEvent();
    const events = await contract.queryFilter(filter);

    let trail = events.map((e) => ({
      orderId: Number(e.args.orderId),
      eventType: e.args.eventType,
      actor: e.args.actor,
      timestamp: Number(e.args.timestamp),
      date: new Date(Number(e.args.timestamp) * 1000).toISOString(),
      dataHash: e.args.dataHash,
      blockNumber: e.blockNumber,
      txHash: e.transactionHash,
    }));

    // Filter by eventType if specified
    if (eventType) {
      trail = trail.filter((e) => e.eventType === eventType);
    }

    // Sort by timestamp descending (newest first)
    trail.sort((a, b) => b.timestamp - a.timestamp);

    // Paginate
    const start = (Number(page) - 1) * Number(limit);
    const paginated = trail.slice(start, start + Number(limit));

    res.json({
      success: true,
      total: trail.length,
      page: Number(page),
      limit: Number(limit),
      events: paginated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/audit/export-readiness/:shipId
 *
 * Check if a shipment is ready for export clearance:
 * - All 4 export documents uploaded
 * - Seller has all 4 compliance certs
 */
async function checkExportReadiness(req, res, next) {
  try {
    const { shipId } = req.params;
    const contract = getReadContract();

    const isReady = await contract.isExportReady(BigInt(shipId));
    const shipment = await contract.shipments(BigInt(shipId));

    // Get export doc set
    const exportDocs = await contract.exportDocs(BigInt(shipId));

    res.json({
      success: true,
      shipId: Number(shipId),
      isExportReady: isReady,
      exportDocStatus: {
        commercialInvoice: exportDocs.commercialInvoiceHash !== "0x" + "0".repeat(64),
        packingList: exportDocs.packingListHash !== "0x" + "0".repeat(64),
        billOfLading: exportDocs.billOfLadingHash !== "0x" + "0".repeat(64),
        certificateOfOrigin: exportDocs.certificateOfOriginHash !== "0x" + "0".repeat(64),
        uploadedCount: Number(exportDocs.uploadedCount),
        requiredCount: 4,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOrderTimeline,
  getFullAuditTrail,
  checkExportReadiness,
  getShipmentTimeline,
  getUnifiedAuditRecord,
};
