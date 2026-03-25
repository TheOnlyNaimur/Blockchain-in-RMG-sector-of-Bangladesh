const { getWriteContract, getReadContract } = require("../config/contract");
const { ethers } = require("ethers");
const saveRecord = require("../utils/saveRecord");

/**
 * POST /api/orders
 * Body: { data, signature, userAddress }
 * data: { details, buyerAddress }
 * Approved seller creates a purchase order for a specific buyer (verified via signature).
 */
async function createOrder(req, res, next) {
  try {
    const { data, signature, userAddress } = req.body;

    // Validate inputs
    if (!data || !signature || !userAddress) {
      return res.status(400).json({
        success: false,
        error: "data, signature, and userAddress are required",
      });
    }

    const { details, buyerAddress } = data;
    if (!details || !buyerAddress) {
      return res.status(400).json({
        success: false,
        error: "details and buyerAddress are required in data",
      });
    }

    // Step 1: Verify signature
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

    if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return res.status(401).json({
        success: false,
        error: "Signature does not match user address",
      });
    }

    // Step 2: Hash the data
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(message));

    // Step 3: Call the contract with backend private key
    if (!process.env.BACKEND_PRIVATE_KEY) {
      return res.status(500).json({
        success: false,
        error: "Backend private key not configured",
      });
    }

    const contract = getWriteContract(process.env.BACKEND_PRIVATE_KEY);
    const tx = await contract.createdealforbuyers(details, buyerAddress);
    const receipt = await tx.wait(1, 60000);

    // Step 4: Verify receipt
    if (!receipt || receipt.status !== 1) {
      return res.status(500).json({
        success: false,
        error: "Transaction failed or reverted",
      });
    }

    // Step 5: Parse event and save record
    const iface = contract.interface;
    let orderId = null;
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === "OrderCreated") {
          orderId = parsed.args.orderId.toString();
          break;
        }
      } catch (_) {}
    }

    await saveRecord("ORDER_CREATED", receipt, {
      orderId,
      sellerAddress: userAddress,
      buyerAddress,
      details,
      signature,
      dataHash,
    });

    res.status(201).json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      orderId,
      message: "Order created. Waiting for buyer acceptance.",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/orders/:orderId/accept
 * Body: { data, signature, userAddress }
 * data: { orderId }
 * Registered buyer accepts the order (verified via signature).
 */
async function acceptOrder(req, res, next) {
  try {
    const { orderId } = req.params;
    const { data, signature, userAddress } = req.body;

    if (!data || !signature || !userAddress) {
      return res.status(400).json({
        success: false,
        error: "data, signature, and userAddress are required",
      });
    }

    // Step 1: Verify signature
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

    if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return res.status(401).json({
        success: false,
        error: "Signature does not match user address",
      });
    }

    // Step 2: Hash the data
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(message));

    // Step 3: Call contract with backend private key
    if (!process.env.BACKEND_PRIVATE_KEY) {
      return res.status(500).json({
        success: false,
        error: "Backend private key not configured",
      });
    }

    const contract = getWriteContract(process.env.BACKEND_PRIVATE_KEY);
    const tx = await contract.acceptorder(BigInt(orderId));
    const receipt = await tx.wait(1, 60000);

    if (!receipt || receipt.status !== 1) {
      return res.status(500).json({
        success: false,
        error: "Transaction failed or reverted",
      });
    }

    await saveRecord("ORDER_ACCEPTED", receipt, {
      orderId,
      buyerAddress: userAddress,
      signature,
      dataHash,
    });

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      message: `Order #${orderId} accepted.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/orders/:orderId/pay
 * Body: { data, signature, userAddress }
 * data: { sellerAddress, amount }
 * Buyer releases payment to the seller after delivery (verified via signature).
 */
async function payOrder(req, res, next) {
  try {
    const { orderId } = req.params;
    const { data, signature, userAddress } = req.body;

    if (!data || !signature || !userAddress) {
      return res.status(400).json({
        success: false,
        error: "data, signature, and userAddress are required",
      });
    }

    const { sellerAddress, amount } = data;
    if (!sellerAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: "sellerAddress and amount are required in data",
      });
    }

    // Step 1: Verify signature
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

    if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return res.status(401).json({
        success: false,
        error: "Signature does not match user address",
      });
    }

    // Step 2: Hash the data
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(message));

    // Step 3: Call contract with backend private key
    if (!process.env.BACKEND_PRIVATE_KEY) {
      return res.status(500).json({
        success: false,
        error: "Backend private key not configured",
      });
    }

    const contract = getWriteContract(process.env.BACKEND_PRIVATE_KEY);
    const tx = await contract.pay(
      sellerAddress,
      BigInt(amount),
      BigInt(orderId),
    );
    const receipt = await tx.wait(1, 60000);

    if (!receipt || receipt.status !== 1) {
      return res.status(500).json({
        success: false,
        error: "Transaction failed or reverted",
      });
    }

    await saveRecord("ORDER_PAID", receipt, {
      orderId,
      buyerAddress: userAddress,
      sellerAddress,
      amountWei: String(amount),
      amountEth: ethers.formatEther(amount),
      signature,
      dataHash,
    });

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      message: `Payment of ${ethers.formatEther(amount)} ETH sent to seller.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/orders/events
 * Returns all OrderCreated and OrderAccepted events.
 */
async function getOrderEvents(req, res, next) {
  try {
    const contract = getReadContract();

    const [createdEvents, acceptedEvents] = await Promise.all([
      contract.queryFilter(contract.filters.OrderCreated(), 0, "latest"),
      contract.queryFilter(contract.filters.OrderAccepted(), 0, "latest"),
    ]);

    const created = createdEvents.map((e) => ({
      type: "OrderCreated",
      orderId: e.args.orderId.toString(),
      seller: e.args.seller,
      buyer: e.args.buyer,
      blockNumber: e.blockNumber,
      txHash: e.transactionHash,
    }));

    const accepted = acceptedEvents.map((e) => ({
      type: "OrderAccepted",
      orderId: e.args.orderId.toString(),
      blockNumber: e.blockNumber,
      txHash: e.transactionHash,
    }));

    res.json({
      success: true,
      data: { created, accepted },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, acceptOrder, payOrder, getOrderEvents };
