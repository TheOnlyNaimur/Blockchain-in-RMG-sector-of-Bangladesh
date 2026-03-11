const {
  getWriteContract,
  getReadContract,
  getRoleContract,
} = require("../config/contract");
const saveRecord = require("../utils/saveRecord");
const { ethers } = require("ethers");

/**
 * POST /api/sellers/register
 * Body: { privateKey, name, tinid, number }
 * Registers a new manufacturer/seller on-chain.
 */
async function registerSeller(req, res, next) {
  try {
    const { privateKey, name, tinid, number } = req.body;
    if (!privateKey || !name || !tinid || !number) {
      return res.status(400).json({
        success: false,
        error: "privateKey, name, tinid and number are required",
      });
    }

    const contract = getWriteContract(privateKey);
    const tx = await contract.registrationseller(
      name,
      BigInt(tinid),
      BigInt(number),
    );
    const receipt = await tx.wait();

    await saveRecord("SELLER_REGISTERED", receipt, {
      sellerAddress: new ethers.Wallet(privateKey).address,
      name,
      tinid: String(tinid),
      number: String(number),
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

    const contract = getRoleContract("certifier");
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
 * Returns all SellerRegistered events from the contract.
 */
async function getSellerEvents(req, res, next) {
  try {
    const contract = getReadContract();
    const filter = contract.filters.SellerRegistered();
    const events = await contract.queryFilter(filter, 0, "latest");

    const parsed = events.map((e) => ({
      sellerAddress: e.args.seller,
      name: e.args.name,
      blockNumber: e.blockNumber,
      txHash: e.transactionHash,
    }));

    res.json({ success: true, count: parsed.length, data: parsed });
  } catch (err) {
    next(err);
  }
}

module.exports = { registerSeller, approveSeller, getSellerEvents };
