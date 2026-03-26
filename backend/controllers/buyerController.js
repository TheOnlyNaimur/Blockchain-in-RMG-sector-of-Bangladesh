const { getWriteContract } = require("../config/contract");
const saveRecord = require("../utils/saveRecord");
const { safeContractCall } = require("../utils/contractErrors");
const { ethers } = require("ethers");

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

module.exports = { registerBuyer };
