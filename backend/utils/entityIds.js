const DOC_TYPE_ABBREV = {
  CommercialInvoice: "CI",
  PackingList: "PL",
  BillOfLading: "BOL",
  CertificateOfOrigin: "COO",
  0: "CI",
  1: "PL",
  2: "BOL",
  3: "COO",
};

const CERT_TYPE_NAMES = ["FireSafety", "BuildingSafety", "LaborStandards", "Environmental"];

function padNum(id, width = 6) {
  return String(id).replace(/\D/g, "").padStart(width, "0") || "000000";
}

function formatPOID(orderId) {
  return `PO-${padNum(orderId)}`;
}

function formatBatchID(batchId) {
  return `BATCH-${padNum(batchId)}`;
}

function formatShipID(shipId) {
  return `SHIP-${padNum(shipId)}`;
}

function formatCertID(sellerAddress, certType) {
  const addrPart = (sellerAddress || "").slice(2, 8).toLowerCase() || "unknown";
  let typePart = certType;
  if (typeof certType === "number") {
    typePart = CERT_TYPE_NAMES[certType] ?? String(certType);
  }
  return `CERT-${addrPart}-${String(typePart).replace(/\s/g, "")}`;
}

function formatDocID(shipId, docType) {
  const abbrev = DOC_TYPE_ABBREV[docType] || String(docType).slice(0, 3).toUpperCase();
  return `DOC-${padNum(shipId)}-${abbrev}`;
}

function formatTXID(txHash, short = false) {
  if (!txHash) return "TX-unknown";
  if (short && txHash.length > 14) {
    return `TX-${txHash.slice(0, 8)}...${txHash.slice(-6)}`;
  }
  return txHash.startsWith("TX-") ? txHash : txHash;
}

function formatRequestID(requestId) {
  return `REQ-${padNum(requestId)}`;
}

/**
 * Parse standardized entity ID strings into type and raw numeric/string id.
 */
function parseEntityId(input) {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();

  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
    return { type: "TX", rawId: trimmed, displayId: trimmed };
  }
  if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return { type: "ADDRESS", rawId: trimmed, displayId: trimmed };
  }

  const patterns = [
    { regex: /^PO-(\d+)$/i, type: "PO" },
    { regex: /^BATCH-(\d+)$/i, type: "BATCH" },
    { regex: /^SHIP-(\d+)$/i, type: "SHIP" },
    { regex: /^CERT-([a-f0-9]+)-(.+)$/i, type: "CERT" },
    { regex: /^DOC-(\d+)-([A-Z]+)$/i, type: "DOC" },
    { regex: /^REQ-(\d+)$/i, type: "REQ" },
    { regex: /^#?ORD-(\d+)$/i, type: "PO" },
  ];

  for (const { regex, type } of patterns) {
    const m = trimmed.match(regex);
    if (m) {
      return {
        type,
        rawId: type === "CERT" ? trimmed : String(parseInt(m[1], 10)),
        displayId: trimmed,
        extra: m[2] || null,
      };
    }
  }

  if (/^\d+$/.test(trimmed)) {
    return { type: "PO", rawId: trimmed, displayId: formatPOID(trimmed) };
  }

  return { type: "UNKNOWN", rawId: trimmed, displayId: trimmed };
}

/**
 * Attach canonical display IDs to a rawData object before persistence.
 */
function enrichRawDataWithIds(rawData = {}) {
  const enriched = { ...rawData };

  if (rawData.orderId != null) {
    enriched.poid = formatPOID(rawData.orderId);
    enriched.POID = enriched.poid;
  }
  if (rawData.batchId != null) {
    enriched.batchDisplayId = formatBatchID(rawData.batchId);
    enriched.BatchID = enriched.batchDisplayId;
  }
  if (rawData.shipId != null) {
    enriched.shipDisplayId = formatShipID(rawData.shipId);
    enriched.ShipID = enriched.shipDisplayId;
  }
  if (rawData.sellerAddress != null && rawData.certType != null) {
    enriched.certId = formatCertID(rawData.sellerAddress, rawData.certType);
    enriched.CertID = enriched.certId;
  }
  if (rawData.shipId != null && rawData.docType != null) {
    enriched.docId = formatDocID(rawData.shipId, rawData.docType);
    enriched.DocID = enriched.docId;
  }
  if (rawData.requestId != null) {
    enriched.requestDisplayId = formatRequestID(rawData.requestId);
  }

  return enriched;
}

module.exports = {
  formatPOID,
  formatBatchID,
  formatShipID,
  formatCertID,
  formatDocID,
  formatTXID,
  formatRequestID,
  parseEntityId,
  enrichRawDataWithIds,
  CERT_TYPE_NAMES,
  DOC_TYPE_ABBREV,
};
