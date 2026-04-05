const { ethers } = require("ethers");
const { getWriteContract, getReadContract } = require("../config/contract");
const saveRecord = require("../utils/saveRecord");
const { safeContractCall } = require("../utils/contractErrors");
const Record = require("../models/Record");

/**
 * POST /api/compliance/issue
 */
async function issueCompliance(req, res, next) {
  try {
    const { sellerAddress, certType, certDocHash, expiresAt, ipfsCid } =
      req.body;
    const privateKey =
      req.body.privateKey || process.env.COMPLIANCE_CHECKER_PRIVATE_KEY;

    if (
      !sellerAddress ||
      certType === undefined ||
      !certDocHash ||
      !expiresAt ||
      !privateKey
    ) {
      return res.status(400).json({
        success: false,
        error:
          "sellerAddress, certType (0-3), certDocHash, expiresAt, and privateKey (or backend key) are required",
      });
    }

    if (certType < 0 || certType > 3) {
      return res.status(400).json({
        success: false,
        error:
          "certType must be 0 (FireSafety), 1 (BuildingSafety), 2 (LaborStandards), or 3 (Environmental)",
      });
    }

    const contract = getWriteContract(privateKey);
    console.log("Issuing compliance certificate on-chain:");
    console.log("  Seller Address:", sellerAddress);
    console.log("  Cert Type:", certType);
    console.log("  Cert Doc Hash:", certDocHash);
    console.log("  Expires At:", expiresAt);
    console.log("  Contract address:", contract.target || contract.address);
    
    const result = await safeContractCall({
      contract,
      method: "issueCompliance",
      args: [sellerAddress, certType, certDocHash, BigInt(expiresAt)],
      context: "issueCompliance",
      res,
    });
    console.log("Compliance issuance result:", result);
    if (!result) return;

    const { receipt } = result;
    const COMPLIANCE_TYPES = [
      "FireSafety",
      "BuildingSafety",
      "LaborStandards",
      "Environmental",
    ];

    await saveRecord("COMPLIANCE_ISSUED", receipt, {
      sellerAddress,
      certType: COMPLIANCE_TYPES[certType],
      certDocHash,
      ipfsCid: ipfsCid || null, // Store IPFS CID if provided
      expiresAt,
      issuedBy: receipt.from,
    });

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      message: `${COMPLIANCE_TYPES[certType]} compliance certificate issued for seller ${sellerAddress}`,
      ipfsCid: ipfsCid || null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/compliance/revoke
 */
async function revokeCompliance(req, res, next) {
  try {
    const { sellerAddress, certType } = req.body;
    const privateKey =
      req.body.privateKey || process.env.COMPLIANCE_CHECKER_PRIVATE_KEY;

    if (!sellerAddress || certType === undefined || !privateKey) {
      return res.status(400).json({
        success: false,
        error:
          "sellerAddress, certType (0-3), and privateKey (or backend key) are required",
      });
    }

    const contract = getWriteContract(privateKey);
    const result = await safeContractCall({
      contract,
      method: "revokeCompliance",
      args: [sellerAddress, certType],
      context: "revokeCompliance",
      res,
    });
    if (!result) return;

    const { receipt } = result;
    const COMPLIANCE_TYPES = [
      "FireSafety",
      "BuildingSafety",
      "LaborStandards",
      "Environmental",
    ];

    await saveRecord("COMPLIANCE_REVOKED", receipt, {
      sellerAddress,
      certType: COMPLIANCE_TYPES[certType],
      revokedBy: receipt.from,
    });

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      message: `${COMPLIANCE_TYPES[certType]} compliance certificate revoked for seller ${sellerAddress}`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/compliance/:sellerAddress
 */
async function getSellerComplianceStatus(req, res, next) {
  try {
    const { sellerAddress } = req.params;

    if (!sellerAddress || !ethers.isAddress(sellerAddress)) {
      return res
        .status(400)
        .json({ success: false, error: "Valid sellerAddress is required" });
    }

    const contract = getReadContract();
    let complianceStatus = [false, false, false, false];
    let isFullyCompliant = false;
    let isApprovedOnChain = false;
    let chainReadError = null;

    try {
      const [complianceRes, fullComplianceRes, certHashRes] = await Promise.all(
        [
          contract.getSellerCompliance(sellerAddress),
          contract.isSellerCompliant(sellerAddress),
          contract.getSellerCertHash(sellerAddress),
        ],
      );

      // Normalize contract return values to booleans.
      complianceStatus = Array.from(complianceRes, (v) => Boolean(v));
      isFullyCompliant = Boolean(fullComplianceRes);
      isApprovedOnChain = certHashRes !== ethers.ZeroHash;
    } catch (err) {
      // Keep endpoint functional even if contract address/ABI/network is out of sync.
      chainReadError =
        err?.shortMessage || err?.message || "Contract read failed";
    }

    // Fallback to latest MongoDB seller approval record. Useful when UI should
    // reflect persisted approval history even if current chain state is reset.
    const latestSellerApproval = await Record.findOne({
      recordType: "SELLER_APPROVED",
      "rawData.sellerAddress": { $regex: `^${sellerAddress}$`, $options: "i" },
    }).sort({ createdAt: -1 });
    const isApprovedInMongo =
      latestSellerApproval?.rawData?.decision === "approved";
    const isApproved = isApprovedOnChain || isApprovedInMongo;

    const COMPLIANCE_TYPES = [
      "FireSafety",
      "BuildingSafety",
      "LaborStandards",
      "Environmental",
    ];

    // Fallback/augment compliance status from MongoDB history.
    // Latest action per cert type wins (ISSUED => valid if not expired, REVOKED => invalid).
    const mongoComplianceMap = {
      FireSafety: false,
      BuildingSafety: false,
      LaborStandards: false,
      Environmental: false,
    };
    const mongoComplianceMeta = {
      FireSafety: null,
      BuildingSafety: null,
      LaborStandards: null,
      Environmental: null,
    };
    const nowTs = Math.floor(Date.now() / 1000);
    const mongoComplianceHistory = await Record.find({
      recordType: { $in: ["COMPLIANCE_ISSUED", "COMPLIANCE_REVOKED"] },
      "rawData.sellerAddress": { $regex: `^${sellerAddress}$`, $options: "i" },
    }).sort({ createdAt: 1, blockNumber: 1 });

    for (const rec of mongoComplianceHistory) {
      const certType = rec?.rawData?.certType;
      if (!COMPLIANCE_TYPES.includes(certType)) continue;

      if (rec.recordType === "COMPLIANCE_REVOKED") {
        mongoComplianceMap[certType] = false;
        mongoComplianceMeta[certType] = null;
        continue;
      }

      if (rec.recordType === "COMPLIANCE_ISSUED") {
        const expiresAt = Number(rec?.rawData?.expiresAt || 0);
        const notExpired = !expiresAt || expiresAt > nowTs;
        mongoComplianceMap[certType] = notExpired;
        mongoComplianceMeta[certType] = {
          certDocHash: rec?.rawData?.certDocHash || null,
          ipfsCid: rec?.rawData?.ipfsCid || null,
          expiresAt: expiresAt || null,
        };
      }
    }

    // Merge chain + Mongo views so persisted records remain visible after local chain resets.
    complianceStatus = COMPLIANCE_TYPES.map(
      (type, i) =>
        Boolean(complianceStatus[i]) || Boolean(mongoComplianceMap[type]),
    );
    isFullyCompliant = complianceStatus.every(Boolean);

    const details = COMPLIANCE_TYPES.map((type, i) => ({
      type,
      isValid: complianceStatus[i],
      certDocHash: mongoComplianceMeta[type]?.certDocHash || null,
      ipfsCid: mongoComplianceMeta[type]?.ipfsCid || null,
      expiresAt: mongoComplianceMeta[type]?.expiresAt || null,
    }));

    res.json({
      success: true,
      sellerAddress,
      isApproved,
      isApprovedOnChain,
      isApprovedInMongo,
      isFullyCompliant,
      compliance: details,
      chainReadOk: !chainReadError,
      chainReadError,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/compliance/events
 */
async function getComplianceEvents(req, res, next) {
  try {
    const contract = getReadContract();

    const [issuedEvents, revokedEvents] = await Promise.all([
      contract.queryFilter(contract.filters.ComplianceIssued()),
      contract.queryFilter(contract.filters.ComplianceRevoked()),
    ]);

    const COMPLIANCE_TYPES = [
      "FireSafety",
      "BuildingSafety",
      "LaborStandards",
      "Environmental",
    ];

    const issued = issuedEvents.map((e) => ({
      type: "ComplianceIssued",
      seller: e.args.seller,
      certType: COMPLIANCE_TYPES[Number(e.args.certType)],
      certDocHash: e.args.certDocHash,
      blockNumber: e.blockNumber,
      txHash: e.transactionHash,
    }));

    const revoked = revokedEvents.map((e) => ({
      type: "ComplianceRevoked",
      seller: e.args.seller,
      certType: COMPLIANCE_TYPES[Number(e.args.certType)],
      blockNumber: e.blockNumber,
      txHash: e.transactionHash,
    }));

    const allEvents = [...issued, ...revoked].sort(
      (a, b) => a.blockNumber - b.blockNumber,
    );

    res.json({ success: true, events: allEvents });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  issueCompliance,
  revokeCompliance,
  getSellerComplianceStatus,
  getComplianceEvents,
};
