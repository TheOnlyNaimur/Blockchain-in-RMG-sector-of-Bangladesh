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
  const cleaned = String(id ?? "").replace(/\D/g, "");
  return (cleaned || "0").padStart(width, "0");
}

export function formatPOID(orderId) {
  return `PO-${padNum(orderId)}`;
}

export function formatBatchID(batchId) {
  return `BATCH-${padNum(batchId)}`;
}

export function formatShipID(shipId) {
  return `SHIP-${padNum(shipId)}`;
}

export function formatCertID(sellerAddress, certType) {
  const addrPart = (sellerAddress || "").slice(2, 8).toLowerCase() || "unknown";
  let typePart = certType;
  if (typeof certType === "number") {
    typePart = CERT_TYPE_NAMES[certType] ?? String(certType);
  }
  return `CERT-${addrPart}-${String(typePart).replace(/\s/g, "")}`;
}

export function formatDocID(shipId, docType) {
  const abbrev = DOC_TYPE_ABBREV[docType] || String(docType).slice(0, 3).toUpperCase();
  return `DOC-${padNum(shipId)}-${abbrev}`;
}

export function parseEntityId(input) {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();

  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
    return { type: "TX", rawId: trimmed, displayId: trimmed };
  }

  const patterns = [
    { regex: /^PO-(\d+)$/i, type: "PO" },
    { regex: /^BATCH-(\d+)$/i, type: "BATCH" },
    { regex: /^SHIP-(\d+)$/i, type: "SHIP" },
    { regex: /^CERT-.+$/i, type: "CERT" },
    { regex: /^DOC-(\d+)-([A-Z]+)$/i, type: "DOC" },
    { regex: /^#?ORD-(\d+)$/i, type: "PO" },
  ];

  for (const { regex, type } of patterns) {
    const m = trimmed.match(regex);
    if (m) {
      return {
        type,
        rawId: type === "CERT" || type === "DOC" ? trimmed : String(parseInt(m[1], 10)),
        displayId: trimmed,
      };
    }
  }

  if (/^\d+$/.test(trimmed)) {
    return { type: "PO", rawId: trimmed, displayId: formatPOID(trimmed) };
  }

  return { type: "UNKNOWN", rawId: trimmed, displayId: trimmed };
}

