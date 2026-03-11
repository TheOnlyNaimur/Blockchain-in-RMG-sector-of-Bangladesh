const { getWriteContract, getReadContract } = require("../config/contract");
const { ethers } = require("ethers");
const saveRecord = require("../utils/saveRecord");

/**
 * POST /api/orders
 * Body: { privateKey, details, buyerAddress }
 * Approved seller creates a purchase order for a specific buyer.
 */
async function createOrder(req, res, next) {
  try {
    const { privateKey, details, buyerAddress } = req.body;
    if (!privateKey || !details || !buyerAddress) {
      return res.status(400).json({
        success: false,
        error: "privateKey, details and buyerAddress are required",
      });
    }

    const contract = getWriteContract(privateKey);
    const tx = await contract.createdealforbuyers(details, buyerAddress);
    const receipt = await tx.wait();

    // Parse the OrderCreated event to get the new orderId
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
      sellerAddress: new ethers.Wallet(privateKey).address,
      buyerAddress,
      details,
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
 * Body: { privateKey }
 * Registered buyer accepts the order identified by orderId.
 */
async function acceptOrder(req, res, next) {
  try {
    const { orderId } = req.params;
    const { privateKey } = req.body;
    if (!privateKey) {
      return res
        .status(400)
        .json({ success: false, error: "privateKey is required" });
    }

    const contract = getWriteContract(privateKey);
    const tx = await contract.acceptorder(BigInt(orderId));
    const receipt = await tx.wait();

    await saveRecord("ORDER_ACCEPTED", receipt, {
      orderId,
      buyerAddress: new ethers.Wallet(privateKey).address,
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
 * Body: { privateKey, sellerAddress, amount }  (amount in wei)
 * Buyer releases ETH payment to the seller after delivery.
 */
async function payOrder(req, res, next) {
  try {
    const { orderId } = req.params;
    const { privateKey, sellerAddress, amount } = req.body;
    if (!privateKey || !sellerAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: "privateKey, sellerAddress and amount (wei) are required",
      });
    }

    const contract = getWriteContract(privateKey);
    const tx = await contract.pay(sellerAddress, BigInt(amount), {
      value: BigInt(amount),
    });
    const receipt = await tx.wait();

    await saveRecord("ORDER_PAID", receipt, {
      orderId,
      buyerAddress: new ethers.Wallet(privateKey).address,
      sellerAddress,
      amountWei: String(amount),
      amountEth: ethers.formatEther(amount),
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
