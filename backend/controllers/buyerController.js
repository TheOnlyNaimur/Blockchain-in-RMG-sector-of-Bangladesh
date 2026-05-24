const { getWriteContract } = require("../config/contract");
const saveRecord = require("../utils/saveRecord");
const { safeContractCall } = require("../utils/contractErrors");
const { ethers } = require("ethers");
const { getReadContract } = require("../config/contract");

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
 * Buyer views seller's public status from their dashboard.
 * Shows only non-sensitive information:
 *  - Registration/approval status
 *  - Compliance certification status (bool only, no certificate content)
 *  - Does NOT expose actual certificates, licenses, or sensitive documents
 */
async function getSellerStatus(req, res, next) {
  try {
    const { sellerAddress } = req.params;

    if (!sellerAddress || !ethers.isAddress(sellerAddress)) {
      return res.status(400).json({
        success: false,
        error: "Valid sellerAddress is required",
      });
    }

    const contract = getReadContract();

    // Get seller info
    const seller = await contract.sellers(sellerAddress);
    if (!seller.add || seller.add === ethers.ZeroAddress) {
      return res.status(404).json({
        success: false,
        error: `Seller ${sellerAddress} not found`,
      });
    }

    // Get compliance status (only bool values, no certificate details)
    const complianceStatus = await contract.getSellerCompliance(sellerAddress);
    const isFullyCompliant = await contract.isSellerCompliant(sellerAddress);

    const COMPLIANCE_TYPES = ["FireSafety", "BuildingSafety", "LaborStandards", "Environmental"];
    const APPLICATION_STATUS = ["Pending", "Approved", "Rejected"];

    // Safe status object - no sensitive data
    const sellerStatus = {
      sellerAddress,
      registered: seller.add !== ethers.ZeroAddress,
      applicationStatus: {
        status: APPLICATION_STATUS[Number(seller.status)],
        statusCode: Number(seller.status),
        approved: seller.status === 1n,
        rejected: seller.status === 2n,
        pending: seller.status === 0n,
      },
      compliance: {
        isFullyCompliant,
        certifications: COMPLIANCE_TYPES.map((type, i) => ({
          type,
          hasValid: complianceStatus[i],
        })),
      },
      // Safe minimal info - tin and number already on-chain
      tinId: seller.tinid ? String(seller.tinid) : null,
      contactNumber: seller.number ? String(seller.number) : null,
    };

    res.json({
      success: true,
      data: sellerStatus,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { registerBuyer, getSellerStatus };
