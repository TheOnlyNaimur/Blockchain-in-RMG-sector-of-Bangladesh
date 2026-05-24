const AccessRevocation = require("../models/AccessRevocation");

/**
 * Reject relayed transactions from revoked addresses.
 * Expects req.body.userAddress on signed endpoints.
 */
async function checkAccessRevocation(req, res, next) {
  try {
    const userAddress = req.body?.userAddress;
    if (!userAddress) return next();

    const revoked = await AccessRevocation.findOne({
      address: userAddress.toLowerCase(),
      active: true,
    });

    if (revoked) {
      return res.status(403).json({
        success: false,
        error: `Access revoked for this address. Reason: ${revoked.reason || "Policy violation"}`,
        code: "ACCESS_REVOKED",
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { checkAccessRevocation };
