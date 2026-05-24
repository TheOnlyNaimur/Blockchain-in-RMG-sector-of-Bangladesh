const { ethers } = require("ethers");
const AccessRevocation = require("../models/AccessRevocation");

const ADMIN_ROLES = new Set([
  (process.env.CERTIFIER_ADDRESS || "").toLowerCase(),
  (process.env.COMPLIANCE_CHECKER_ADDRESS || "").toLowerCase(),
]);

function isAdminAddress(address) {
  return ADMIN_ROLES.has((address || "").toLowerCase());
}

async function revokeAccess(req, res, next) {
  try {
    const { address, role, reason, revokedBy } = req.body;

    if (!address || !revokedBy) {
      return res.status(400).json({ success: false, error: "address and revokedBy are required" });
    }

    if (!ethers.isAddress(address)) {
      return res.status(400).json({ success: false, error: "Invalid address" });
    }

    if (!isAdminAddress(revokedBy)) {
      return res.status(403).json({
        success: false,
        error: "Only certifier or compliance checker can revoke access",
      });
    }

    await AccessRevocation.updateMany(
      { address: address.toLowerCase(), active: true },
      { active: false }
    );

    const revocation = await AccessRevocation.create({
      address: address.toLowerCase(),
      role: role || "seller",
      reason: reason || "",
      revokedBy: revokedBy.toLowerCase(),
      active: true,
    });

    res.json({
      success: true,
      message: `Access revoked for ${address}`,
      data: revocation,
    });
  } catch (err) {
    next(err);
  }
}

async function restoreAccess(req, res, next) {
  try {
    const { address, restoredBy } = req.body;

    if (!address || !restoredBy) {
      return res.status(400).json({ success: false, error: "address and restoredBy are required" });
    }

    if (!isAdminAddress(restoredBy)) {
      return res.status(403).json({
        success: false,
        error: "Only certifier or compliance checker can restore access",
      });
    }

    const result = await AccessRevocation.updateMany(
      { address: address.toLowerCase(), active: true },
      { active: false }
    );

    res.json({
      success: true,
      message: `Access restored for ${address}`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    next(err);
  }
}

async function listRevocations(req, res, next) {
  try {
    const { active } = req.query;
    const filter = active === "true" ? { active: true } : active === "false" ? { active: false } : {};

    const revocations = await AccessRevocation.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: revocations.length, data: revocations });
  } catch (err) {
    next(err);
  }
}

module.exports = { revokeAccess, restoreAccess, listRevocations };
