const {
  getReadContract,
  getRoleContract,
  getWriteContract,
} = require("../config/contract");
const saveRecord = require("../utils/saveRecord");
const { safeContractCall } = require("../utils/contractErrors");
const { ethers } = require("ethers");
const Record = require("../models/Record");
const { uploadToIPFS } = require("../utils/ipfs");
const { Readable } = require("stream");

/**
 * POST /api/sellers/register
 */
async function registerSeller(req, res, next) {
  try {
    const { data, signature, userAddress } = req.body;

    if (!data || !signature || !userAddress) {
      return res.status(400).json({
        success: false,
        error: "data, signature, and userAddress are required",
      });
    }

    const { name, tinid, number } = data;
    if (!name || tinid === undefined || !number) {
      return res.status(400).json({
        success: false,
        error: "name, tinid, and number are required in data",
      });
    }

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

    const tinNum = Number(tinid);
    const contactNum = Number(number);
    if (!Number.isInteger(tinNum) || tinNum <= 0) {
      return res.status(400).json({ success: false, error: "TIN must be a valid non-zero number (digits only)." });
    }
    if (!Number.isInteger(contactNum) || contactNum <= 0) {
      return res.status(400).json({ success: false, error: "Contact number must be a valid non-zero number (digits only)." });
    }

    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(message));

    if (!process.env.BACKEND_PRIVATE_KEY) {
      return res.status(500).json({ success: false, error: "Backend private key not configured" });
    }

    const contract = getWriteContract(process.env.BACKEND_PRIVATE_KEY);
    const result = await safeContractCall({
      contract,
      method: "registrationseller",
      args: [userAddress, dataHash, BigInt(tinNum), BigInt(contactNum)],
      context: "registerSeller",
      res,
    });
    if (!result) return;

    const { receipt } = result;

    await saveRecord("SELLER_REGISTERED", receipt, {
      sellerAddress: userAddress,
      name,
      tinid: String(tinid),
      number: String(number),
      signature,
      dataHash,
    });

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      message: "Seller registered successfully. Awaiting certifier approval.",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/sellers/approve
 * Certifier approves or rejects seller KYC on-chain (no certificate upload).
 */
async function approveSeller(req, res, next) {
  try {
    const { sellerAddress, assign } = req.body;
    if (!sellerAddress || assign === undefined) {
      return res.status(400).json({
        success: false,
        error: "sellerAddress and assign (1|2) are required",
      });
    }

    if (Number(assign) !== 1 && Number(assign) !== 2) {
      return res.status(400).json({
        success: false,
        error: "assign must be 1 (approve) or 2 (reject)",
      });
    }

    const privateKey = req.body.privateKey || process.env.CERTIFIER_PRIVATE_KEY;
    if (!privateKey) {
      return res.status(400).json({ success: false, error: "privateKey is required or backend not configured" });
    }

    const contract = getRoleContract(privateKey);
    const result = await safeContractCall({
      contract,
      method: "approveseller",
      args: [sellerAddress, BigInt(Number(assign))],
      context: "approveSeller",
      res,
    });
    if (!result) return;

    const { receipt } = result;
    const statusLabel = Number(assign) === 1 ? "approved" : "rejected";

    await saveRecord("SELLER_APPROVED", receipt, {
      certifierAddress: receipt.from,
      sellerAddress,
      decision: statusLabel,
    });

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      decision: statusLabel,
      message: Number(assign) === 1 ? "Seller approved successfully." : "Seller rejected successfully.",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/sellers/approve-business
 * Upload seller business certificate to IPFS and record off-chain approval.
 */
async function approveSellerBusiness(req, res, next) {
  try {
    const { sellerAddress } = req.body;
    const privateKey = req.body.privateKey || process.env.BUSINESS_CERTIFIER_PRIVATE_KEY;

    if (!sellerAddress) {
      return res.status(400).json({ success: false, error: "sellerAddress is required" });
    }

    if (!privateKey) {
      return res.status(400).json({
        success: false,
        error: "privateKey is required or BUSINESS_CERTIFIER_PRIVATE_KEY not configured",
      });
    }

    if (!ethers.isAddress(sellerAddress)) {
      return res.status(400).json({ success: false, error: "Invalid seller address" });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "At least one seller certificate file is required. Use multipart/form-data with field 'file'",
      });
    }

    const stream = Readable.from(req.file.buffer);
    stream.path = req.file.originalname;

    const ipfsResult = await uploadToIPFS(stream, req.file.originalname, {
      certType: "SellerBusinessDocument",
      sellerAddress,
      uploadedAt: new Date().toISOString(),
    });

    const docHash = ethers.keccak256(ethers.toUtf8Bytes(ipfsResult.cid));

    await new Record({
      recordType: "SELLER_BUSINESS_CERTIFICATE",
      txHash: ipfsResult.cid,
      blockNumber: 0,
      dataHash: docHash,
      rawData: {
        sellerAddress,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        cid: ipfsResult.cid,
        docHash,
        ipfsUrl: ipfsResult.ipfsUrl,
        uploadedBy: new ethers.Wallet(privateKey).address,
        uploadedAt: new Date().toISOString(),
      },
      contractFeedback: {},
    }).save();

    await new Record({
      recordType: "SELLER_BUSINESS_APPROVED",
      txHash: `approved_${Date.now()}`,
      blockNumber: 0,
      dataHash: ethers.keccak256(ethers.toUtf8Bytes(sellerAddress)),
      rawData: {
        sellerAddress,
        approvedBy: new ethers.Wallet(privateKey).address,
        businessCertificatesCount: 1,
        timestamp: new Date().toISOString(),
      },
      contractFeedback: {},
    }).save();

    res.json({
      success: true,
      sellerAddress,
      approvalType: "business",
      message: "Seller business approved. Certificate uploaded to IPFS.",
      certificatesUploaded: [
        {
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          cid: ipfsResult.cid,
          docHash,
          ipfsUrl: ipfsResult.ipfsUrl,
        },
      ],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/sellers/approve-compliance
 * Certifier approves seller on-chain and issues 4 compliance certificates when assign=1.
 */
async function approveSellerCompliance(req, res, next) {
  try {
    const { sellerAddress, assign, expiresAt } = req.body;

    if (!sellerAddress || assign === undefined) {
      return res.status(400).json({
        success: false,
        error: "sellerAddress and assign (1=approve, 2=reject) are required",
      });
    }

    if (Number(assign) !== 1 && Number(assign) !== 2) {
      return res.status(400).json({
        success: false,
        error: "assign must be 1 (approve) or 2 (reject)",
      });
    }

    const privateKey = req.body.privateKey || process.env.COMPLIANCE_CHECKER_PRIVATE_KEY || process.env.CERTIFIER_PRIVATE_KEY;
    if (!privateKey) {
      return res.status(400).json({ success: false, error: "privateKey is required or backend not configured" });
    }

    if (Number(assign) === 1) {
      if (!expiresAt) {
        return res.status(400).json({ success: false, error: "expiresAt is required when approving" });
      }
      const COMPLIANCE_FILE_KEYS = ["file_0", "file_1", "file_2", "file_3"];
      for (const fileKey of COMPLIANCE_FILE_KEYS) {
        if (!req.files || !req.files[fileKey]) {
          return res.status(400).json({
            success: false,
            error: `Missing required certificate file: ${fileKey}`,
          });
        }
      }
    }

    const contract = getRoleContract(privateKey);
    const result = await safeContractCall({
      contract,
      method: "approveseller",
      args: [sellerAddress, BigInt(Number(assign))],
      context: "approveSellerCompliance",
      res,
    });
    if (!result) return;

    const { receipt } = result;
    const statusLabel = Number(assign) === 1 ? "approved" : "rejected";

    await saveRecord("SELLER_APPROVED", receipt, {
      certifierAddress: receipt.from,
      sellerAddress,
      decision: statusLabel,
      approvalType: "compliance",
    });

    let certificateResults = [];
    if (Number(assign) === 1) {
      const COMPLIANCE_TYPES = ["FireSafety", "BuildingSafety", "LaborStandards", "Environmental"];
      const expiryTime = Number(expiresAt);
      if (isNaN(expiryTime) || expiryTime <= Date.now() / 1000) {
        return res.status(400).json({
          success: false,
          error: "expiresAt must be a valid future Unix timestamp",
        });
      }

      const complianceContract = getWriteContract(
        process.env.COMPLIANCE_CHECKER_PRIVATE_KEY || privateKey
      );

      for (let i = 0; i < 4; i++) {
        const fileKey = `file_${i}`;
        const fileObj = Array.isArray(req.files[fileKey]) ? req.files[fileKey][0] : req.files[fileKey];
        const buffer = fileObj.buffer || fileObj.data;
        const name = fileObj.originalname || fileObj.name;

        const stream = Readable.from(buffer);
        stream.path = name;

        const ipfsResult = await uploadToIPFS(stream, name, {
          certType: COMPLIANCE_TYPES[i],
          sellerAddress,
          uploadedAt: new Date().toISOString(),
          expiresAt: new Date(expiryTime * 1000).toISOString(),
        });

        const certDocHash = ethers.keccak256(ethers.toUtf8Bytes(ipfsResult.cid));

        const certResult = await safeContractCall({
          contract: complianceContract,
          method: "issueCompliance",
          args: [sellerAddress, i, certDocHash, BigInt(expiryTime)],
          context: `issueCertificate_${i}`,
          res,
        });

        if (!certResult) return;

        await saveRecord("COMPLIANCE_ISSUED", certResult.receipt, {
          sellerAddress,
          certType: COMPLIANCE_TYPES[i],
          certTypeIndex: i,
          certDocHash,
          cid: ipfsResult.cid,
          ipfsUrl: ipfsResult.ipfsUrl,
          fileName: name,
          expiresAt: expiryTime,
          issuedBy: certResult.receipt.from,
        });

        certificateResults.push({
          certType: COMPLIANCE_TYPES[i],
          success: true,
          cid: ipfsResult.cid,
          certDocHash,
        });
      }
    }

    res.json({
      success: true,
      approvalType: "compliance",
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      decision: statusLabel,
      certificatesUploaded: certificateResults.length,
      message:
        Number(assign) === 1
          ? `Seller approved with ${certificateResults.length}/4 compliance certificates issued.`
          : "Seller rejected successfully.",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/sellers/events
 */
async function getSellerEvents(req, res, next) {
  try {
    const records = await Record.find({
      recordType: { $in: ["SELLER_REGISTERED", "SELLER_APPROVED"] },
    }).sort({ createdAt: 1 });

    const sellersMap = new Map();

    records.forEach((r) => {
      const data = r.rawData;
      if (r.recordType === "SELLER_REGISTERED") {
        sellersMap.set(data.sellerAddress, {
          address: data.sellerAddress,
          name: data.name || "Unknown Entity",
          tin: data.tinid || data.tin || "N/A",
          status: "pending",
          submitted: new Date(r.createdAt).toLocaleString(),
          gradient: "from-blue-500 to-cyan-400",
        });
      } else if (r.recordType === "SELLER_APPROVED") {
        if (sellersMap.has(data.sellerAddress)) {
          const seller = sellersMap.get(data.sellerAddress);
          seller.status = data.decision === "approved" ? "approved" : "rejected";
          seller.date = new Date(r.createdAt).toLocaleDateString();
          seller.certHash = r.contractFeedback?.txHash || "0x00";
          seller.gasUsed = r.contractFeedback?.gasUsed ? `${r.contractFeedback.gasUsed} gas` : "N/A";
          seller.reason = data.decision === "rejected" ? "Verification failed" : null;
          seller.reviewer = "Certifier Node";
        }
      }
    });

    res.json({ success: true, count: sellersMap.size, data: Array.from(sellersMap.values()).reverse() });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerSeller,
  approveSeller,
  approveSellerBusiness,
  approveSellerCompliance,
  getSellerEvents,
};
