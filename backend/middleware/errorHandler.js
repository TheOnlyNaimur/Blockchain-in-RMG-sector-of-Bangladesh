const { decodeContractError } = require("../utils/contractErrors");

/**
 * Central error-handling middleware.
 * Catches errors thrown from controllers and returns a consistent JSON response.
 * Properly decodes Solidity custom errors from ethers v6.
 */
function errorHandler(err, req, res, next) {
  console.error("[ERROR]", err?.shortMessage || err?.message || err);

  // 1. Try to decode known Solidity custom errors (ethers v6)
  const customMsg = decodeContractError(err);

  // 2. Fall back to legacy reason / shortMessage
  const revertMsg =
    customMsg ||
    err?.revert?.args?.[0] ||
    err?.reason ||
    err?.shortMessage ||
    null;

  // 3. Determine HTTP status
  let status = 500;
  if (revertMsg) {
    status = 400;
    if (revertMsg.includes("already registered")) status = 409;
    if (revertMsg.includes("Unauthorized") || revertMsg.includes("only the")) status = 403;
  }

  const message = revertMsg || err.message || "Internal server error";
  res.status(status).json({ success: false, error: message });
}

module.exports = errorHandler;
