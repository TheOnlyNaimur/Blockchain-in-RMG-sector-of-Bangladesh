/**
 * Central error-handling middleware.
 * Catches errors thrown from controllers and returns a consistent JSON response.
 */
function errorHandler(err, req, res, next) {
  console.error("[ERROR]", err);

  // Ethers.js contract revert — extract the reason string when available
  const revertMsg =
    err?.revert?.args?.[0] ||
    err?.reason ||
    err?.shortMessage ||
    null;

  const status = revertMsg ? 400 : 500;
  const message = revertMsg || err.message || "Internal server error";

  res.status(status).json({ success: false, error: message });
}

module.exports = errorHandler;
