const crypto = require("crypto");

/**
 * Returns a hex-encoded SHA-256 hash of the data object.
 * Used as a tamper-detection fingerprint for integrity checks.
 */
function hashData(data) {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

/**
 * Verify a stored record's integrity:
 * re-hash the stored rawData and compare to the stored dataHash.
 */
function verifyIntegrity(rawData, storedHash) {
  const recomputed = hashData(rawData);
  return {
    valid: recomputed === storedHash,
    recomputedHash: recomputed,
    storedHash,
  };
}

module.exports = { hashData, verifyIntegrity };
