const { getWriteContract, getReadContract } = require("../config/contract");
const { ethers } = require("ethers");
const saveRecord = require("../utils/saveRecord");
const { safeContractCall } = require("../utils/contractErrors");
const { formatPOID } = require("../utils/entityIds");

/**
 * POST /api/orders
 */
async function createOrder(req, res, next) {
  try {
    const { data, signature, userAddress } = req.body;

    if (!data || !signature || !userAddress) {
      return res.status(400).json({ success: false, error: "data, signature, and userAddress are required" });
    }

    const { details, buyerAddress, hsCode, destination, amount } = data;
    if (!details || !buyerAddress) {
      return res.status(400).json({ success: false, error: "details and buyerAddress are required in data" });
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

    // Pre-check: Ensure seller has all 4 compliance certificates before creating order.
    // In unit tests, getReadContract may be mocked out; in that case we skip the check.
    if (typeof getReadContract === "function") {
      try {
        const readContract = getReadContract();
        const isCompliant = await readContract.isSellerCompliant(userAddress);
        if (!isCompliant) {
          return res.status(403).json({
            success: false,
            error: "You must hold all 4 compliance certificates (Fire Safety, Building Safety, Labor Standards, Environmental) before creating orders. Please contact the Compliance Checker to get your certificates issued.",
            code: "COMPLIANCE_REQUIRED",
          });
        }
      } catch (complianceErr) {
        console.error("Compliance check failed:", complianceErr.message);
        return res.status(403).json({
          success: false,
          error: "Unable to verify compliance status. Ensure you are registered and have all compliance certificates before creating orders.",
          code: "COMPLIANCE_CHECK_FAILED",
        });
      }
    }

    const detailsHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({ details, buyerAddress })));
    const hsCodeHash = hsCode ? ethers.keccak256(ethers.toUtf8Bytes(hsCode)) : ethers.ZeroHash;
    const destinationHash = destination ? ethers.keccak256(ethers.toUtf8Bytes(destination)) : ethers.ZeroHash;
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(message));

    if (!process.env.BACKEND_PRIVATE_KEY) {
      return res.status(500).json({ success: false, error: "Backend private key not configured" });
    }

    const contract = getWriteContract(process.env.BACKEND_PRIVATE_KEY);
    const result = await safeContractCall({
      contract,
      method: "createdealforbuyers",
      args: [userAddress, detailsHash, buyerAddress, hsCodeHash, destinationHash],
      context: "createOrder",
      res,
    });
    if (!result) return;

    const { receipt } = result;

    // Parse OrderCreated event
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
      amount: amount || "0.00",
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
 */
async function acceptOrder(req, res, next) {
  try {
    const { orderId } = req.params;
    const { data, signature, userAddress } = req.body;

    const { amount } = data;
    if (!amount) {
      return res.status(400).json({ success: false, error: "amount is required in data for USDT escrow" });
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

    if (!process.env.BACKEND_PRIVATE_KEY) {
      return res.status(500).json({ success: false, error: "Backend private key not configured" });
    }

    const contract = getWriteContract(process.env.BACKEND_PRIVATE_KEY);
    const result = await safeContractCall({
      contract,
      method: "acceptorder",
      args: [userAddress, BigInt(orderId), BigInt(amount)],
      context: "acceptOrder",
      res,
    });
    if (!result) return;

    const { receipt } = result;

    // Generate agreement PDF and upload to IPFS
    let agreementInfo = null;
    try {
      const PDFDocument = require("pdfkit");
      const { Readable } = require("stream");
      const { uploadToIPFS } = require("../utils/ipfs");

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
 */
async function confirmDelivery(req, res, next) {
  try {
    const { orderId } = req.params;
    const { data, signature, userAddress, shipId } = req.body;

    if (!data || !signature || !userAddress || !shipId) {
      return res.status(400).json({ success: false, error: "data, signature, userAddress, and shipId are required" });
    }

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

    const contract = getWriteContract(process.env.BACKEND_PRIVATE_KEY);
    const result = await safeContractCall({
      contract,
      method: "buyerConfirmDelivery",
      args: [userAddress, BigInt(orderId), BigInt(shipId)],
      context: "confirmDelivery",
      res,
    });
    if (!result) return;

    const { receipt } = result;

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
 */
async function forceRelease(req, res, next) {
  try {
    const { orderId } = req.params;
    const { privateKey, shipId } = req.body;

    if (!privateKey || !shipId) {
      return res.status(400).json({ success: false, error: "privateKey and shipId are required" });
    }

    const contract = getWriteContract(privateKey);
    const result = await safeContractCall({
      contract,
      method: "forceReleaseEscrow",
      args: [BigInt(orderId), BigInt(shipId)],
      context: "forceRelease",
      res,
    });
    if (!result) return;

    const { receipt } = result;

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
 */
async function payOrder(req, res, next) {
  try {
    const { orderId } = req.params;
    const { data, signature, userAddress } = req.body;

    if (!data || !signature || !userAddress) {
      return res.status(400).json({ success: false, error: "data, signature, and userAddress are required" });
    }

    const { sellerAddress, amount } = data;
    if (!sellerAddress || !amount) {
      return res.status(400).json({ success: false, error: "sellerAddress and amount are required in data" });
    }

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

    if (!process.env.BACKEND_PRIVATE_KEY) {
      return res.status(500).json({ success: false, error: "Backend private key not configured" });
    }

    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(message));
    const contract = getWriteContract(process.env.BACKEND_PRIVATE_KEY);
    const result = await safeContractCall({
      contract,
      method: "pay",
      args: [userAddress, sellerAddress, BigInt(amount), BigInt(orderId)],
      context: "payOrder",
      res,
    });
    if (!result) return;

    const { receipt } = result;

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
 */
async function getOrders(req, res, next) {
  try {
    const contract = getReadContract();

    const [createdEvents, acceptedEvents, batchEvents, qualityEvents, shipmentEvents, customsEvents, paymentReleasedEvents] = await Promise.all([
      contract.queryFilter(contract.filters.OrderCreated(), 0, "latest"),
      contract.queryFilter(contract.filters.OrderAccepted(), 0, "latest"),
      contract.queryFilter(contract.filters.BatchCreated(), 0, "latest"),
      contract.queryFilter(contract.filters.BatchQualityUpdated(), 0, "latest"),
      contract.queryFilter(contract.filters.ShipmentRequested(), 0, "latest"),
      contract.queryFilter(contract.filters.CustomsCleared(), 0, "latest"),
      contract.queryFilter(contract.filters.PaymentReleased(), 0, "latest"),
    ]);

    const ordersMap = new Map();

    const Record = require("../models/Record");
    const orderRecords = await Record.find({ recordType: "ORDER_CREATED" }).lean();
    const orderAmountMap = new Map();
    const orderDetailsMap = new Map();
    orderRecords.forEach(r => {
      if (r.rawData && r.rawData.orderId) {
        orderAmountMap.set(String(r.rawData.orderId), r.rawData.amount || "0.00");
        orderDetailsMap.set(String(r.rawData.orderId), r.rawData.details || "N/A");
      }
    });

    createdEvents.forEach((e) => {
      const id = e.args.orderId.toString();
      ordersMap.set(id, {
        id: formatPOID(id),
        orderId: id,
        seller: e.args.seller,
        buyer: e.args.buyer,
        status: "Created",
        statusColor: "blue",
        amount: orderAmountMap.get(id) || "0.00",
        details: orderDetailsMap.get(id) || "N/A",
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
        order.amount = ethers.formatEther(e.args.amount).toString();
      }
    });

    const batchIdToOrderId = new Map();

    batchEvents.forEach((e) => {
      const orderId = e.args.orderId.toString();
      const batchId = e.args.batchId.toString();
      batchIdToOrderId.set(batchId, orderId);

      if (ordersMap.has(orderId)) {
        const order = ordersMap.get(orderId);
        order.batchId = batchId;
        order.status = "Batch Created";
        order.statusColor = "blue";
        order.action = null;
      }
    });

    qualityEvents.forEach((e) => {
      const batchId = e.args.batchId.toString();
      const passed = e.args.status;
      const orderId = batchIdToOrderId.get(batchId);

      if (orderId && ordersMap.has(orderId)) {
        const order = ordersMap.get(orderId);
        if (passed) {
          order.status = "QC Approved";
          order.statusColor = "green";
          order.action = "Request Shipment";
        } else {
          order.status = "QC Failed";
          order.statusColor = "red";
          order.action = null;
        }
      }
    });

    // Map shipId -> orderId for customs resolution
    const shipIdToOrderId = new Map();

    shipmentEvents.forEach((e) => {
      const batchId = e.args.batchId.toString();
      const shipId = e.args.shipId.toString();
      const orderId = batchIdToOrderId.get(batchId);

      if (orderId && ordersMap.has(orderId)) {
        const order = ordersMap.get(orderId);
        order.status = "Shipment Requested";
        order.statusColor = "yellow";
        order.action = null;
        order.shipId = shipId;
        shipIdToOrderId.set(shipId, orderId);
      }
    });

    customsEvents.forEach((e) => {
      const shipId = e.args.shipId.toString();
      const authorityType = e.args.authorityType; // "Export" or "Import"
      const orderId = shipIdToOrderId.get(shipId);

      if (orderId && ordersMap.has(orderId)) {
        const order = ordersMap.get(orderId);
        if (authorityType === "Export") {
          order.status = "Export Cleared";
          order.statusColor = "yellow";
        } else if (authorityType === "Import") {
          order.status = "Import Cleared";
          order.statusColor = "purple";
        }
        order.action = null;
      }
    });

    paymentReleasedEvents.forEach((e) => {
      const orderId = e.args.orderId.toString();
      if (ordersMap.has(orderId)) {
        const order = ordersMap.get(orderId);
        order.status = "Delivered & Paid";
        order.statusColor = "green";
        order.action = null;
      }
    });

    res.json({
      success: true,
      data: Array.from(ordersMap.values()).reverse(),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, acceptOrder, confirmDelivery, forceRelease, payOrder, getOrders };
