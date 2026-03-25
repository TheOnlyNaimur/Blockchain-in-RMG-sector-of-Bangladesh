const { getWriteContract } = require("../config/contract");
const saveRecord = require("../utils/saveRecord");
const { ethers } = require("ethers");

/**
 * POST /api/buyers/register
 * Body: { data, signature, userAddress }
 * data: { name, license, contact } - the form data the user filled
 * signature: the digital signature from MetaMask signMessage
 * userAddress: the public address of the buyer
 *
 * Flow:
 * 1. Verify signature (proves user signed the data)
 * 2. Hash the data for on-chain storage
 * 3. Call contract.registerBuyer() from backend
 * 4. Wait for confirmation
 * 5. Store record in database
 */
async function registerBuyer(req, res, next) {
  try {
    const { data, signature, userAddress } = req.body;

    // Validate inputs
    if (!data || !signature || !userAddress) {
      return res.status(400).json({
        success: false,
        error: "data, signature, and userAddress are required",
      });
    }

    const { name, license, contact } = data;
    if (!name) {
      return res.status(400).json({
        success: false,
        error: "name is required in data",
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

    // Step 2: Hash the data for on-chain reference
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(message));

    // Step 3: Call the smart contract from the backend
    if (!process.env.BACKEND_PRIVATE_KEY) {
      return res.status(500).json({
        success: false,
        error: "Backend private key not configured",
      });
    }

    const contract = getWriteContract(process.env.BACKEND_PRIVATE_KEY);
    const tx = await contract.registrationbuyer(name);

    // Step 4: Wait for transaction confirmation
    const receipt = await tx.wait(1, 60000); // 1 confirmation, 60 second timeout

    if (!receipt || receipt.status !== 1) {
      return res.status(500).json({
        success: false,
        error: "Transaction failed or reverted",
      });
    }

    // Step 5: Save metadata to database
    await saveRecord("BUYER_REGISTERED", receipt, {
      buyerAddress: userAddress,
      name,
      license,
      contact,
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
