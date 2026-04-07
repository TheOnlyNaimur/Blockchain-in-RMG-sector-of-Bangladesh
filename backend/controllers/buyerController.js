const { getWriteContract, getReadContract } = require("../config/contract");
const saveRecord = require("../utils/saveRecord");
const { safeContractCall } = require("../utils/contractErrors");
const { ethers } = require("ethers");
const Record = require("../models/Record");

/**
 * POST /api/buyers/register
 */
async function registerBuyer(req, res, next) {
  try {
    const { data, signature, userAddress } = req.body;

    if (!data || !signature || !userAddress) {
      return res.status(400).json({
        success: false,
        error: "data, signature, and userAddress are required",
      });
    }

    const { name } = data;
    if (!name) {
      return res.status(400).json({ success: false, error: "name is required in data" });
    }

    // Verify signature
    const message = JSON.stringify(data);
    let recoveredAddress;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (err) {
      return res.status(401).json({ success: false, error: "Invalid signature" });
    }

    if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return res.status(401).json({ success: false, error: "Signature does not match user address" });
    }

    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(message));

    if (!process.env.BACKEND_PRIVATE_KEY) {
      return res.status(500).json({ success: false, error: "Backend private key not configured" });
    }

    const contract = getWriteContract(process.env.BACKEND_PRIVATE_KEY);
    const result = await safeContractCall({
      contract,
      method: "registrationbuyer",
      args: [userAddress, dataHash],
      context: "registerBuyer",
      res,
    });
    if (!result) return;

    const { receipt } = result;

    await saveRecord("BUYER_REGISTERED", receipt, {
      buyerAddress: userAddress,
      name,
      license: data.license,
      contact: data.contact,
      signature,
      dataHash,
    });

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      message: "Buyer registered successfully.",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/buyers/seller-status/:sellerAddress
 * Buyer-safe visibility endpoint: exposes only summary statuses.
 */
async function getSellerStatusForBuyer(req, res, next) {
  try {
    const { sellerAddress } = req.params;

    if (!sellerAddress || !ethers.isAddress(sellerAddress)) {
      return res.status(400).json({ success: false, error: "Valid sellerAddress is required" });
    }

    const [latestRegistration, latestApproval] = await Promise.all([
      Record.findOne({
        recordType: "SELLER_REGISTERED",
        "rawData.sellerAddress": sellerAddress,
      }).sort({ createdAt: -1 }),
      Record.findOne({
        recordType: "SELLER_APPROVED",
        "rawData.sellerAddress": sellerAddress,
      }).sort({ createdAt: -1 }),
    ]);

    let approvalStatus = "not_registered";
    if (latestRegistration) {
      approvalStatus = "pending";
    }
    if (latestApproval?.rawData?.decision === "approved") {
      approvalStatus = "approved";
    } else if (latestApproval?.rawData?.decision === "rejected") {
      approvalStatus = "rejected";
    }

    const certifierCertificateIssued = Boolean(
      latestApproval?.rawData?.decision === "approved" && latestApproval?.rawData?.certDocHash,
    );

    const contract = getReadContract();
    const [complianceStatuses, isFullyCompliant] = await Promise.all([
      contract.getSellerCompliance(sellerAddress),
      contract.isSellerCompliant(sellerAddress),
    ]);

    const complianceTypes = [
      "FireSafety",
      "BuildingSafety",
      "LaborStandards",
      "Environmental",
    ];

    const compliance = complianceTypes.map((type, idx) => ({
      type,
      issued: Boolean(complianceStatuses[idx]),
    }));

    const complianceIssuedCount = compliance.filter((c) => c.issued).length;
    const issuedCount = (certifierCertificateIssued ? 1 : 0) + complianceIssuedCount;
    const requiredCount = 5;

    res.json({
      success: true,
      data: {
        sellerAddress,
        approvalStatus,
        certifierCertificateIssued,
        compliance: {
          isFullyCompliant: Boolean(isFullyCompliant),
          issuedCount: complianceIssuedCount,
          requiredCount: 4,
          items: compliance,
        },
        certificateIssuanceSummary: {
          issuedCount,
          requiredCount,
          allIssued: issuedCount === requiredCount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { registerBuyer, getSellerStatusForBuyer };
