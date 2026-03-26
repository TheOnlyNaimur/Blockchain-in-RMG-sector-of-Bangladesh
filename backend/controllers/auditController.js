const { getReadContract } = require("../config/contract");

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

    res.json({
      success: true,
      orderId: Number(orderId),
      eventCount: timeline.length,
      timeline,
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
};
