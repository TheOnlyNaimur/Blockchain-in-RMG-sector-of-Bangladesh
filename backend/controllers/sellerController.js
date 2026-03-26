const {
  getReadContract,
  getRoleContract,
  getWriteContract,
} = require("../config/contract");
const saveRecord = require("../utils/saveRecord");
const { ethers } = require("ethers");

/**
 * POST /api/sellers/register
 * Body: { data, signature, userAddress }
 * data: { name, tinid, number } - the form data the user filled
 * signature: the digital signature from MetaMask signMessage
 * userAddress: the public address of the seller
 *
 * Flow:
 * 1. Verify signature (proves user signed the data)
 * 2. Hash the data for on-chain storage
 * 3. Call contract.registerSeller() from backend
 * 4. Wait for confirmation
 * 5. Store record in database
 */
async function registerSeller(req, res, next) {
  try {
    const { data, signature, userAddress } = req.body;

    // Validate inputs
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

    // Step 1: Reconstruct the message and verify signature
    const message = JSON.stringify(data);
    let recoveredAddress;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: "Invalid signature",
      });
    }

    // Verify that the signature came from the claimed user address
    if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return res.status(401).json({
        success: false,
        error: "Signature does not match user address",
      });
    }

    // Step 2: Hash the data for on-chain storage (privacy: only hash goes on-chain)
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(message));

    // Step 3: Call the smart contract from the backend
    if (!process.env.BACKEND_PRIVATE_KEY) {
      return res.status(500).json({
        success: false,
        error: "Backend private key not configured",
      });
    }

    const contract = getWriteContract(process.env.BACKEND_PRIVATE_KEY);
    const tx = await contract.registrationseller(
      userAddress,
      dataHash,
      BigInt(tinid),
      BigInt(number),
    );

    // Step 4: Wait for transaction confirmation
    const receipt = await tx.wait(1, 60000); // 1 confirmation, 60 second timeout

    if (!receipt || receipt.status !== 1) {
      return res.status(500).json({
        success: false,
        error: "Transaction failed or reverted",
      });
    }

    // Step 5: Save metadata to database
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
 * Body: { privateKey, sellerAddress, assign }
 * Only the certifier address can call this.
 * assign: 1 = approve, 2 = reject
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

    const privateKey = req.body.privateKey || process.env.CERTIFIER_PRIVATE_KEY;
    if (!privateKey) {
      return res.status(400).json({
        success: false,
        error: "privateKey is required or backend not configured",
      });
    }

    const contract = getRoleContract(privateKey);
    const tx = await contract.approveseller(sellerAddress, BigInt(assign));
    const receipt = await tx.wait();
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
 * Returns aggregated sellers from MongoDB records.
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
          name: data.companyName || "Unknown Entity",
          tin: data.tin || "N/A",
          status: "pending",
          submitted: new Date(r.createdAt).toLocaleString(),
          gradient: "from-blue-500 to-cyan-400", // Default UI color
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
