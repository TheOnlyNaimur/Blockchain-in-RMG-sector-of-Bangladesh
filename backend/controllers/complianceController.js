const { ethers } = require("ethers");
const { getWriteContract, getReadContract, provider } = require("../config/contract");
const saveRecord = require("../utils/saveRecord");
const { safeContractCall } = require("../utils/contractErrors");
const Record = require("../models/Record");
const { uploadToIPFS } = require("../utils/ipfs");
const { Readable } = require("stream");

/**
 * POST /api/compliance/upload-certificate/:sellerAddress
 * Certifier uploads a certificate file for a seller.
 * File is uploaded to IPFS, hash is stored on-chain.
 *
 * Body:
 *  - certType: 0|1|2|3 (FireSafety|BuildingSafety|LaborStandards|Environmental)
 *  - expiresAt: Unix timestamp for certificate expiration
 *  - privateKey: Certifier's private key (or backend key from env)
 *
 * File: multipart form-data with 'file' field (certificate PDF/image)
 */
async function uploadCertificate(req, res, next) {
  try {
    const { sellerAddress } = req.params;
    const { certType, expiresAt } = req.body;
    const privateKey = req.body.privateKey || process.env.BACKEND_PRIVATE_KEY;

    const COMPLIANCE_TYPES = ["FireSafety", "BuildingSafety", "LaborStandards", "Environmental"];

    if (!sellerAddress || certType === undefined || !expiresAt || !privateKey) {
      return res.status(400).json({
        success: false,
        error: "sellerAddress, certType (0-3), expiresAt, and privateKey are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file provided. Use multipart/form-data with field 'file'",
      });
    }

    if (certType < 0 || certType > 3) {
      return res.status(400).json({
        success: false,
        error: "certType must be 0 (FireSafety), 1 (BuildingSafety), 2 (LaborStandards), or 3 (Environmental)",
      });
    }

    if (!ethers.isAddress(sellerAddress)) {
      return res.status(400).json({
        success: false,
        error: "Invalid seller address",
      });
    }

    const expiryTime = Number(expiresAt);
    if (isNaN(expiryTime) || expiryTime <= Date.now() / 1000) {
      return res.status(400).json({
        success: false,
        error: "expiresAt must be a valid future Unix timestamp",
      });
    }

    // Upload file to IPFS
    const stream = Readable.from(req.file.buffer);
    stream.path = req.file.originalname;

    const ipfsResult = await uploadToIPFS(stream, req.file.originalname, {
      certType: COMPLIANCE_TYPES[certType],
      sellerAddress,
      uploadedAt: new Date().toISOString(),
      expiresAt: new Date(expiryTime * 1000).toISOString(),
    });

    // Hash the IPFS CID to store on-chain
    const certDocHash = ethers.keccak256(ethers.toUtf8Bytes(ipfsResult.cid));

    // Call smart contract to issue compliance
    const contract = getWriteContract(privateKey);
    const result = await safeContractCall({
      contract,
      method: "issueCompliance",
      args: [sellerAddress, certType, certDocHash, BigInt(expiryTime)],
      context: "uploadCertificate",
      res,
    });
    if (!result) return;

    const { receipt } = result;

    // Save to database
    await saveRecord("COMPLIANCE_ISSUED", receipt, {
      sellerAddress,
      certType: COMPLIANCE_TYPES[certType],
      certDocHash,
      cid: ipfsResult.cid,
      ipfsUrl: ipfsResult.ipfsUrl,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      expiresAt: expiryTime,
      issuedBy: receipt.from,
    });

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      cid: ipfsResult.cid,
      ipfsUrl: ipfsResult.ipfsUrl,
      certDocHash,
      certType: COMPLIANCE_TYPES[certType],
      expiresAt: expiryTime,
      message: `${COMPLIANCE_TYPES[certType]} certificate uploaded and issued for seller ${sellerAddress}`,
    });
  } catch (err) {
    next(err);
  }
}

async function ensureRoleWalletHasGas(privateKey) {
  if (!privateKey) return;

  const signer = new ethers.Wallet(privateKey, provider);
  const balance = await provider.getBalance(signer.address);
  const minBalance = ethers.parseEther("0.002");
  if (balance >= minBalance) return;

  const network = await provider.getNetwork();
  // Auto-fund only on local anvil-style chains.
  if (network.chainId !== 31337n) return;

  const funderKey = process.env.BACKEND_PRIVATE_KEY;
  if (!funderKey) return;

  const funder = new ethers.Wallet(funderKey, provider);
  if (funder.address.toLowerCase() === signer.address.toLowerCase()) return;

  const funderBalance = await provider.getBalance(funder.address);
  const topUpAmount = ethers.parseEther("0.05");
  if (funderBalance <= topUpAmount) return;

  const tx = await funder.sendTransaction({
    to: signer.address,
    value: topUpAmount,
  });
  await tx.wait();
}

/**
 * POST /api/compliance/issue
 */
async function issueCompliance(req, res, next) {
  try {
    const { sellerAddress, certType, certDocHash, cid, expiresAt } = req.body;
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

    await ensureRoleWalletHasGas(privateKey);

    const contract = getWriteContract(privateKey);
    const result = await safeContractCall({
      contract,
      method: "issueCompliance",
      args: [sellerAddress, certType, certDocHash, BigInt(expiresAt)],
      context: "issueCompliance",
      res,
    });
    if (!result) return;

    const { receipt } = result;
    const COMPLIANCE_TYPES = ["FireSafety", "BuildingSafety", "LaborStandards", "Environmental"];

    await saveRecord("COMPLIANCE_ISSUED", receipt, {
      sellerAddress,
      certType: COMPLIANCE_TYPES[certType],
      certDocHash,
      cid,
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

    await ensureRoleWalletHasGas(privateKey);

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
 */
async function getSellerComplianceStatus(req, res, next) {
  try {
    const { sellerAddress } = req.params;

    if (!sellerAddress || !ethers.isAddress(sellerAddress)) {
      return res.status(400).json({ success: false, error: "Valid sellerAddress is required" });
    }

    const contract = getReadContract();
    const complianceStatus = await contract.getSellerCompliance(sellerAddress);
    const isFullyCompliant = await contract.isSellerCompliant(sellerAddress);

    const COMPLIANCE_TYPES = ["FireSafety", "BuildingSafety", "LaborStandards", "Environmental"];

    const records = await Record.find({
      recordType: "COMPLIANCE_ISSUED",
      "rawData.sellerAddress": sellerAddress,
    }).sort({ createdAt: -1 });

    const details = COMPLIANCE_TYPES.map((type, i) => {
      const latestRecord = records.find((r) => r.rawData.certType === type);
      return {
        type,
        isValid: complianceStatus[i],
        cid: latestRecord ? latestRecord.rawData.cid : null,
        certDocHash: latestRecord ? latestRecord.rawData.certDocHash : null,
      };
    });

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
 */
async function getComplianceEvents(req, res, next) {
  try {
    const contract = getReadContract();

    const [issuedEvents, revokedEvents] = await Promise.all([
      contract.queryFilter(contract.filters.ComplianceIssued()),
      contract.queryFilter(contract.filters.ComplianceRevoked()),
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

    const allEvents = [...issued, ...revoked].sort((a, b) => a.blockNumber - b.blockNumber);

    res.json({ success: true, events: allEvents });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadCertificate,
  issueCompliance,
  revokeCompliance,
  getSellerComplianceStatus,
  getComplianceEvents,
};
