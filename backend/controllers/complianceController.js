const { ethers } = require("ethers");
const { getWriteContract, getReadContract } = require("../config/contract");
const saveRecord = require("../utils/saveRecord");

/**
 * POST /api/compliance/issue
 * Body: { sellerAddress, certType, certDocHash, expiresAt, privateKey }
 *
 * certType: 0=FireSafety, 1=BuildingSafety, 2=LaborStandards, 3=Environmental
 * certDocHash: keccak256 of IPFS CID of the certificate document
 * expiresAt: Unix timestamp (seconds) when the certificate expires
 * privateKey: compliance checker's wallet private key
 */
async function issueCompliance(req, res, next) {
  try {
    const { sellerAddress, certType, certDocHash, expiresAt } = req.body;
    const privateKey = req.body.privateKey || process.env.COMPLIANCE_CHECKER_PRIVATE_KEY;

    if (!sellerAddress || certType === undefined || !certDocHash || !expiresAt || !privateKey) {
      return res.status(400).json({
        success: false,
        error: "sellerAddress, certType (0-3), certDocHash, expiresAt, and privateKey (or backend key) are required",
      });
    }

    if (certType < 0 || certType > 3) {
      return res.status(400).json({
        success: false,
        error: "certType must be 0 (FireSafety), 1 (BuildingSafety), 2 (LaborStandards), or 3 (Environmental)",
      });
    }

    const contract = getWriteContract(privateKey);
    const tx = await contract.issueCompliance(
      sellerAddress,
      certType,
      certDocHash,
      BigInt(expiresAt),
    );
    const receipt = await tx.wait(1, 60000);

    if (!receipt || receipt.status !== 1) {
      return res.status(500).json({
        success: false,
        error: "Transaction failed on-chain",
      });
    }

    const COMPLIANCE_TYPES = ["FireSafety", "BuildingSafety", "LaborStandards", "Environmental"];

    // Save to MongoDB
    await saveRecord("COMPLIANCE_ISSUED", receipt, {
      sellerAddress,
      certType: COMPLIANCE_TYPES[certType],
      certDocHash,
      expiresAt,
      issuedBy: receipt.from,
    });

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      message: `${COMPLIANCE_TYPES[certType]} compliance certificate issued for seller ${sellerAddress}`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/compliance/revoke
 * Body: { sellerAddress, certType, privateKey }
 */
async function revokeCompliance(req, res, next) {
  try {
    const { sellerAddress, certType } = req.body;
    const privateKey = req.body.privateKey || process.env.COMPLIANCE_CHECKER_PRIVATE_KEY;

    if (!sellerAddress || certType === undefined || !privateKey) {
      return res.status(400).json({
        success: false,
        error: "sellerAddress, certType (0-3), and privateKey (or backend key) are required",
      });
    }

    const contract = getWriteContract(privateKey);
    const tx = await contract.revokeCompliance(sellerAddress, certType);
    const receipt = await tx.wait(1, 60000);

    const COMPLIANCE_TYPES = ["FireSafety", "BuildingSafety", "LaborStandards", "Environmental"];

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
 * Returns the compliance status for all 4 types (on-chain query).
 */
async function getSellerComplianceStatus(req, res, next) {
  try {
    const { sellerAddress } = req.params;

    if (!sellerAddress || !ethers.isAddress(sellerAddress)) {
      return res.status(400).json({
        success: false,
        error: "Valid sellerAddress is required",
      });
    }

    const contract = getReadContract();

    // Get boolean array [FireSafety, BuildingSafety, LaborStandards, Environmental]
    const complianceStatus = await contract.getSellerCompliance(sellerAddress);
    const isFullyCompliant = await contract.isSellerCompliant(sellerAddress);

    const COMPLIANCE_TYPES = ["FireSafety", "BuildingSafety", "LaborStandards", "Environmental"];

    const details = COMPLIANCE_TYPES.map((type, i) => ({
      type,
      isValid: complianceStatus[i],
    }));

    res.json({
      success: true,
      sellerAddress,
      isFullyCompliant,
      compliance: details,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/compliance/events
 * Returns all ComplianceIssued and ComplianceRevoked events from the contract.
 */
async function getComplianceEvents(req, res, next) {
  try {
    const contract = getReadContract();

    const issuedFilter = contract.filters.ComplianceIssued();
    const revokedFilter = contract.filters.ComplianceRevoked();

    const [issuedEvents, revokedEvents] = await Promise.all([
      contract.queryFilter(issuedFilter),
      contract.queryFilter(revokedFilter),
    ]);

    const COMPLIANCE_TYPES = ["FireSafety", "BuildingSafety", "LaborStandards", "Environmental"];

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

    // Merge and sort by block number
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
