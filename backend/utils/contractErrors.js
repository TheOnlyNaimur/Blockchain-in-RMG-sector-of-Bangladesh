/**
 * contractErrors.js
 *
 * Central utility for decoding Solidity custom errors from ethers v6 and
 * providing human-readable error messages to the frontend.
 *
 * The smart contract (MyContract.sol) uses custom errors like:
 *   error Unauthorized();
 *   error AlreadyRegistered();
 *   error NotRegistered();
 *   error NotApproved();
 *   error InvalidInput();
 *   error InvalidStatus();
 *   error InvalidOrder();
 *   error InsufficientPayment();
 *   error TransferFailed();
 *   error ComplianceNotMet();
 *   error ExportDocsIncomplete();
 *
 * Ethers v6 wraps revert data in various nested paths depending on
 * whether it was a staticCall, estimateGas, or sendTransaction.
 */
const { ethers } = require("ethers");

// ─── Selector → Human Message Map ───────────────────────────────────────────
const CUSTOM_ERROR_MAP = {
  [ethers.id("Unauthorized()").slice(0, 10)]:
    "Unauthorized: you do not have the required role to perform this action.",
  [ethers.id("AlreadyRegistered()").slice(0, 10)]:
    "This wallet address is already registered. Each address can only register once.",
  [ethers.id("NotRegistered()").slice(0, 10)]:
    "This address is not registered. Please complete registration first.",
  [ethers.id("NotApproved()").slice(0, 10)]:
    "This address is registered but has not been approved yet. Please wait for certifier approval.",
  [ethers.id("InvalidInput()").slice(0, 10)]:
    "Invalid input: one or more required fields are missing or zero.",
  [ethers.id("InvalidStatus()").slice(0, 10)]:
    "Operation not allowed in the current status.",
  [ethers.id("InvalidOrder()").slice(0, 10)]:
    "Order ID is invalid or does not exist.",
  [ethers.id("InsufficientPayment()").slice(0, 10)]:
    "Insufficient payment amount.",
  [ethers.id("TransferFailed()").slice(0, 10)]:
    "Token transfer failed.",
  [ethers.id("ComplianceNotMet()").slice(0, 10)]:
    "Seller does not have all 4 required compliance certifications (FireSafety, BuildingSafety, LaborStandards, Environmental). Please obtain all certificates first.",
  [ethers.id("ExportDocsIncomplete()").slice(0, 10)]:
    "Not all 4 export documents have been uploaded (CommercialInvoice, PackingList, BillOfLading, CertificateOfOrigin).",
};

// ─── Context-Aware Error Messages ───────────────────────────────────────────
// Each controller can pass a "context" key when calling safeContractCall.
// This map provides more specific messages for certain error/context combos.
const CONTEXT_ERROR_MAP = {
  "registerSeller:AlreadyRegistered": "This seller wallet is already registered on-chain.",
  "registerBuyer:AlreadyRegistered": "This buyer wallet is already registered on-chain.",
  "createOrder:NotRegistered": "The seller address is not registered. Seller must register first.",
  "createOrder:NotApproved": "The seller is registered but not yet approved by the certifier. Cannot create orders until approved.",
  "createOrder:NotRegistered:buyer": "The buyer address is not registered. Buyer must register first.",
  "acceptOrder:NotRegistered": "The buyer address is not registered on-chain.",
  "createBatch:NotRegistered": "The seller is not registered. Cannot create batches.",
  "createBatch:NotApproved": "The seller is not yet approved by the certifier. Cannot create batches until approved.",
  "createBatch:ComplianceNotMet": "Seller must have all 4 compliance certifications before creating a production batch.",
  "createBatch:InvalidStatus": "The order must be in 'Accepted' status before a batch can be created.",
  "qualityCheck:Unauthorized": "Only the designated quality checker can perform quality checks.",
  "shipReq:InvalidStatus": "The batch must be quality-approved before requesting shipment.",
  "shipReq:Unauthorized": "Only the seller who owns this order can request shipment.",
  "uploadDoc:Unauthorized": "Only the assigned freight forwarder can upload documents for this shipment.",
  "uploadDoc:InvalidStatus": "This document type has already been uploaded for this shipment.",
  "exportVerify:Unauthorized": "Only export customs authority can clear shipments for export.",
  "exportVerify:ExportDocsIncomplete": "Cannot clear: not all 4 export documents have been uploaded yet.",
  "importVerify:Unauthorized": "Only import customs authority can clear shipments for import.",
  "importVerify:InvalidStatus": "Shipment must be export-cleared before import clearance.",
  "issueCompliance:Unauthorized": "Only the compliance checker can issue compliance certificates.",
  "issueCompliance:NotRegistered": "Seller is not registered. Register the seller first.",
  "issueCompliance:NotApproved": "Seller is not approved. Approve the seller first.",
  "revokeCompliance:Unauthorized": "Only the compliance checker can revoke compliance certificates.",
  "revokeCompliance:InvalidStatus": "This compliance certificate is already invalid or revoked.",
  "approveSeller:Unauthorized": "Only the certifier can approve or reject sellers.",
  "approveSeller:NotRegistered": "This seller address is not registered.",
  "approveSeller:InvalidStatus": "Seller is not in pending status (may already be approved or rejected).",
  "confirmDelivery:Unauthorized": "Only the buyer of this order can confirm delivery.",
  "confirmDelivery:InvalidStatus": "Order is not in the correct status for delivery confirmation.",
};

/**
 * Extract the 4-byte error selector from an ethers v6 error.
 * Ethers v6 nests the data in different places depending on error flow.
 */
function extractErrorData(err) {
  // Direct data on error
  if (typeof err?.data === "string" && err.data.startsWith("0x")) return err.data;
  // Nested in err.error.data (common with provider-level errors)
  if (typeof err?.error?.data === "string" && err.error.data.startsWith("0x")) return err.error.data;
  // Nested in err.info.error.data (ethers v6 wrapping)
  if (typeof err?.info?.error?.data === "string" && err.info.error.data.startsWith("0x")) return err.info.error.data;
  // Sometimes it's in err.transaction or err.receipt
  if (typeof err?.transaction?.data === "string" && err.transaction.data.startsWith("0x")) return null; // tx data, not error
  return null;
}

/**
 * Decode a Solidity custom error into a human-readable message.
 * @param {Error} err - The ethers v6 error object
 * @param {string} [context] - e.g. "createOrder", "registerSeller" for context-aware messages
 * @returns {string|null} Human-readable error message, or null if unknown
 */
function decodeContractError(err, context) {
  const data = extractErrorData(err);
  if (!data || data.length < 10) return null;

  const selector = data.slice(0, 10).toLowerCase();
  const genericMsg = CUSTOM_ERROR_MAP[selector];
  if (!genericMsg) return null;

  // Try context-specific message first
  if (context) {
    // Extract error name from selector → find matching key
    const errorName = Object.entries(CUSTOM_ERROR_MAP).find(
      ([sel]) => sel.toLowerCase() === selector
    );
    if (errorName) {
      // Match the error name (e.g. "AlreadyRegistered" from the map value)
      for (const [key, msg] of Object.entries(CONTEXT_ERROR_MAP)) {
        if (key.startsWith(context + ":")) {
          const errorKey = key.split(":")[1];
          const expectedSelector = ethers.id(`${errorKey}()`).slice(0, 10).toLowerCase();
          if (expectedSelector === selector) {
            return msg;
          }
        }
      }
    }
  }

  return genericMsg;
}

/**
 * Wraps a smart contract write call with proper error handling.
 * Performs a staticCall first to catch reverts before spending gas,
 * then sends the real transaction.
 *
 * @param {object} options
 * @param {ethers.Contract} options.contract - The ethers contract instance
 * @param {string} options.method - The method name to call (e.g. "registrationseller")
 * @param {Array} options.args - Arguments to pass to the method
 * @param {string} options.context - Context for error messages (e.g. "registerSeller")
 * @param {object} options.res - Express response object
 * @returns {{ tx: object, receipt: object } | null} tx and receipt if success, null if error sent
 */
async function safeContractCall({ contract, method, args, context, res }) {
  // 1. Pre-flight: staticCall to detect revert before real tx
  try {
    await contract[method].staticCall(...args);
  } catch (simErr) {
    const msg = decodeContractError(simErr, context);
    if (msg) {
      // Determine appropriate HTTP status
      let status = 400;
      if (msg.includes("already registered")) status = 409;
      if (msg.includes("Unauthorized") || msg.includes("only the")) status = 403;
      res.status(status).json({ success: false, error: msg });
      return null;
    }
    // If we can't decode, check for shortMessage/reason as fallback
    const fallback = simErr?.shortMessage || simErr?.reason || simErr?.message;
    if (fallback && fallback.includes("revert")) {
      res.status(400).json({ success: false, error: fallback });
      return null;
    }
    // Unknown sim error — let it try the real tx anyway
  }

  // 2. Real transaction
  const tx = await contract[method](...args);
  const receipt = await tx.wait(1, 60000);

  if (!receipt || receipt.status !== 1) {
    res.status(500).json({ success: false, error: "Transaction failed or reverted on-chain." });
    return null;
  }

  return { tx, receipt };
}

module.exports = {
  CUSTOM_ERROR_MAP,
  extractErrorData,
  decodeContractError,
  safeContractCall,
};
