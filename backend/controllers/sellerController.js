const {
  getReadContract,
  getRoleContract,
  getWriteContract,
} = require("../config/contract");
const saveRecord = require("../utils/saveRecord");
const { safeContractCall } = require("../utils/contractErrors");
const { ethers } = require("ethers");

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

    // Validate numeric fields before touching the chain
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
    if (!result) return; // error already sent

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
 */
async function approveSeller(req, res, next) {
  try {
    const { sellerAddress, assign } = req.body;
    if (!sellerAddress || assign === undefined) {
      return res.status(400).json({
        success: false,
        error: "sellerAddress and assign (1=approve, 2=reject) are required",
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
      args: [sellerAddress, BigInt(assign)],
      context: "approveSeller",
      res,
    });
    if (!result) return;

    const { receipt } = result;
    const statusLabel = Number(assign) === 1 ? "approved" : "rejected";

    await saveRecord("SELLER_APPROVED", receipt, {
      certifierAddress: process.env.CERTIFIER_ADDRESS,
      sellerAddress,
      decision: statusLabel,
    });

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      message: `Seller ${statusLabel} successfully.`,
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
    const Record = require("../models/Record");
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

module.exports = { registerSeller, approveSeller, getSellerEvents };
