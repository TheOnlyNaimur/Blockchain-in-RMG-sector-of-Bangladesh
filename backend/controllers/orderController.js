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

    const { details, buyerAddress, hsCode, destination } = data;
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

    // Step 2: Hash the data for on-chain storage (privacy: only hash goes on-chain)
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(message));
    const detailsHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({ details, buyerAddress })));
    const hsCodeHash = hsCode
      ? ethers.keccak256(ethers.toUtf8Bytes(hsCode))
      : ethers.ZeroHash;
    const destinationHash = destination
      ? ethers.keccak256(ethers.toUtf8Bytes(destination))
      : ethers.ZeroHash;

    // Step 3: Call contract with backend private key
    if (!process.env.BACKEND_PRIVATE_KEY) {
      return res.status(500).json({
        success: false,
        error: "Backend private key not configured",
      });
    }

    const contract = getWriteContract(process.env.BACKEND_PRIVATE_KEY);
    const tx = await contract.createdealforbuyers(userAddress, detailsHash, buyerAddress, hsCodeHash, destinationHash);
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

    const { amount } = data;
    if (!amount) {
      return res.status(400).json({
        success: false,
        error: "amount is required in data for USDT escrow",
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

    // Step 2: Hash the data for on-chain storage
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(message));

    // Step 3: Call contract with backend private key
    if (!process.env.BACKEND_PRIVATE_KEY) {
      return res.status(500).json({
        success: false,
        error: "Backend private key not configured",
      });
    }

    const contract = getWriteContract(process.env.BACKEND_PRIVATE_KEY);
    const tx = await contract.acceptorder(userAddress, BigInt(orderId), BigInt(amount));
    const receipt = await tx.wait(1, 60000);

    if (!receipt || receipt.status !== 1) {
      return res.status(500).json({
        success: false,
        error: "Transaction failed or reverted",
      });
    }

    // Generate agreement PDF and upload to IPFS
    let agreementInfo = null;
    try {
      const PDFDocument = require("pdfkit");
      const { Readable } = require("stream");
      const { uploadToIPFS } = require("../utils/ipfs");

      // Build PDF in memory
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));

      const pdfDone = new Promise((resolve) => doc.on("end", resolve));

      doc.fontSize(20).text("TRADE AGREEMENT", { align: "center" });
      doc.moveDown();
      doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`);
      doc.moveDown();
      doc.fontSize(12).text(`Order ID: #${orderId}`);
      doc.text(`Seller Address: ${data.sellerAddress || userAddress}`);
      doc.text(`Buyer Address: ${userAddress}`);
      doc.text(`USDT Amount: ${amount}`);
      doc.moveDown();
      doc.text("Terms:", { underline: true });
      doc.fontSize(10)
        .text("1. Seller agrees to produce and ship goods as per order details.")
        .text("2. Buyer has escrowed USDT which will be released upon delivery confirmation.")
        .text("3. All compliance certifications must be valid before production.")
        .text("4. Four export documents are required before customs clearance.")
        .text("5. Buyer must confirm delivery to release payment.")
        .text("6. Import customs may force-release if buyer does not confirm.");
      doc.moveDown(2);
      doc.text(`Transaction Hash: ${receipt.hash}`);
      doc.text(`Block Number: ${receipt.blockNumber}`);
      doc.end();

      await pdfDone;
      const pdfBuffer = Buffer.concat(chunks);
      const pdfStream = Readable.from(pdfBuffer);
      pdfStream.path = `agreement_order_${orderId}.pdf`;

      const ipfsResult = await uploadToIPFS(pdfStream, `agreement_order_${orderId}.pdf`, {
        orderId: String(orderId),
        type: "agreement",
      });

      await saveRecord("AGREEMENT_GENERATED", receipt, {
        orderId,
        ipfsCid: ipfsResult.cid,
        ipfsUrl: ipfsResult.ipfsUrl,
      });

      agreementInfo = { ipfsCid: ipfsResult.cid, ipfsUrl: ipfsResult.ipfsUrl };
    } catch (pdfErr) {
      console.error("Agreement PDF generation failed (non-fatal):", pdfErr.message);
    }

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      agreement: agreementInfo,
      message: `Order #${orderId} accepted. ${agreementInfo ? "Agreement PDF stored on IPFS." : ""}`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/orders/:orderId/confirm-delivery
 * Body: { data, signature, userAddress, shipId }
 * Buyer confirms goods received → releases escrowed USDT to seller.
 */
async function confirmDelivery(req, res, next) {
  try {
    const { orderId } = req.params;
    const { data, signature, userAddress, shipId } = req.body;

    if (!data || !signature || !userAddress || !shipId) {
      return res.status(400).json({
        success: false,
        error: "data, signature, userAddress, and shipId are required",
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
      return res.status(401).json({
        success: false,
        error: "Signature does not match user address",
      });
    }

    const contract = getWriteContract(process.env.BACKEND_PRIVATE_KEY);
    const tx = await contract.buyerConfirmDelivery(userAddress, BigInt(orderId), BigInt(shipId));
    const receipt = await tx.wait(1, 60000);

    if (!receipt || receipt.status !== 1) {
      return res.status(500).json({
        success: false,
        error: "Transaction failed or reverted",
      });
    }

    await saveRecord("BUYER_CONFIRMED_DELIVERY", receipt, {
      orderId,
      shipId,
      buyerAddress: userAddress,
    });

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      message: `Delivery confirmed. Escrow released to seller for order #${orderId}.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/orders/:orderId/force-release
 * Body: { privateKey, shipId }
 * Import customs force-releases escrow if buyer doesn't confirm.
 */
async function forceRelease(req, res, next) {
  try {
    const { orderId } = req.params;
    const { privateKey, shipId } = req.body;

    if (!privateKey || !shipId) {
      return res.status(400).json({
        success: false,
        error: "privateKey and shipId are required",
      });
    }

    const contract = getWriteContract(privateKey);
    const tx = await contract.forceReleaseEscrow(BigInt(orderId), BigInt(shipId));
    const receipt = await tx.wait(1, 60000);

    if (!receipt || receipt.status !== 1) {
      return res.status(500).json({
        success: false,
        error: "Transaction failed or reverted",
      });
    }

    await saveRecord("FORCE_RELEASE_BY_CUSTOMS", receipt, {
      orderId,
      shipId,
      releasedBy: receipt.from,
    });

    res.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      message: `Escrow force-released by import customs for order #${orderId}.`,
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
      userAddress,
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
 * GET /api/orders
 * Returns all orders by aggregating OrderCreated, OrderAccepted, and BatchCreated events.
 */
async function getOrders(req, res, next) {
  try {
    const contract = getReadContract();

    // Fetch all relevant events
    const [createdEvents, acceptedEvents, batchEvents] = await Promise.all([
      contract.queryFilter(contract.filters.OrderCreated(), 0, "latest"),
      contract.queryFilter(contract.filters.OrderAccepted(), 0, "latest"),
      contract.queryFilter(contract.filters.BatchCreated(), 0, "latest"),
    ]);

    // Map to keep track of order state by orderId
    const ordersMap = new Map();

    createdEvents.forEach((e) => {
      const id = e.args.orderId.toString();
      ordersMap.set(id, {
        id: `#ORD-${id.padStart(3, '0')}`,
        orderId: id,
        seller: e.args.seller,
        buyer: e.args.buyer,
        status: "Created",
        statusColor: "blue", // Created color
        amount: "0.00",
        action: null,
      });
    });

    acceptedEvents.forEach((e) => {
      const id = e.args.orderId.toString();
      if (ordersMap.has(id)) {
        const order = ordersMap.get(id);
        order.status = "Accepted";
        order.statusColor = "green";
        order.action = "Create Batch";
        // Format USDT (6 decimals typical for USDT, but here it's likely standard 18 token mock or wei)
        order.amount = ethers.formatEther(e.args.amount).toString();
      }
    });

    batchEvents.forEach((e) => {
      const id = e.args.orderId.toString();
      if (ordersMap.has(id)) {
        const order = ordersMap.get(id);
        order.status = "Batch Created";
        order.statusColor = "blue";
        order.action = null; // Batch already created
      }
    });

    res.json({
      success: true,
      data: Array.from(ordersMap.values()).reverse(), // Newest first
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, acceptOrder, confirmDelivery, forceRelease, payOrder, getOrders };
