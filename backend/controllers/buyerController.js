const { getWriteContract } = require("../config/contract");
const saveRecord = require("../utils/saveRecord");
const { ethers } = require("ethers");

/**
 * POST /api/buyers/register
 * Body: { privateKey, name }
 * Registers a new international buyer on-chain.
 */
async function registerBuyer(req, res, next) {
  try {
    const { privateKey, name } = req.body;
    if (!privateKey || !name) {
      return res
        .status(400)
        .json({ success: false, error: "privateKey and name are required" });
    }

    const contract = getWriteContract(privateKey);
    const tx = await contract.registrationbuyer(name);
    const receipt = await tx.wait();

    await saveRecord("BUYER_REGISTERED", receipt, {
      buyerAddress: new ethers.Wallet(privateKey).address,
      name,
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
