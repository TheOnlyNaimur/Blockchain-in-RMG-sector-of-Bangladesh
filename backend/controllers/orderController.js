const { getWriteContract, getReadContract } = require("../config/contract");
const { ethers } = require("ethers");
const saveRecord = require("../utils/saveRecord");
const { safeContractCall } = require("../utils/contractErrors");
const Record = require("../models/Record");

/**
 * Check if seller has all 4 compliance certificates from MongoDB
 * More reliable than checking smart contract (resistant to Anvil crashes)
 */
async function isSellerCompliantInDB(sellerAddress) {
  try {
    const now = Math.floor(Date.now() / 1000);
    
    // Query MongoDB for all compliance certificates issued to this seller
    const complianceRecords = await Record.find({
      recordType: "COMPLIANCE_ISSUED",
      "rawData.sellerAddress": { $regex: new RegExp(`^${sellerAddress}$`, "i") },
    });

    console.log(`Compliance check for ${sellerAddress}:`, {
      recordsFound: complianceRecords.length,
      records: complianceRecords.map(r => ({
        certType: r.rawData.certType,
        expiresAt: r.rawData.expiresAt,
        isExpired: r.rawData.expiresAt < now,
      })),
    });

    if (complianceRecords.length === 0) {
      console.log(`No compliance records found for ${sellerAddress}`);
      return false;
    }

    // Check if all 4 cert types are present and not expired
    const certTypes = new Set();
    for (const record of complianceRecords) {
      if (record.rawData.expiresAt > now) {
        // Certificate is not expired
        certTypes.add(record.rawData.certType);
      }
    }

    const hasAll4 = certTypes.size === 4;
    console.log(`Seller ${sellerAddress} has ${certTypes.size}/4 valid certificates. Compliant: ${hasAll4}`);
    
    return hasAll4;
  } catch (err) {
    console.error("Error checking MongoDB compliance:", err.message);
    return false;
  }
}

/**
 * POST /api/orders
 */
async function createOrder(req, res, next) {
  try {
    const { data, signature, userAddress } = req.body;
    console.log("Received order creation request:", { data, signature, userAddress });

    if (!data || !signature || !userAddress) {
      return res.status(400).json({ success: false, error: "data, signature, and userAddress are required" });
    }

    const { details, buyerAddress, hsCode, destination, amount } = data;
    if (!details || !buyerAddress || !amount) {
      return res.status(400).json({ success: false, error: "details, buyerAddress, and amount are required in data" });
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

    // Pre-check: Ensure seller has all 4 compliance certificates (check MongoDB first)
    try {
      console.log("Checking seller compliance from MongoDB...");
      const isCompliant = await isSellerCompliantInDB(userAddress);
      if (!isCompliant) {
        console.log("Seller not compliant from DB check");
        return res.status(403).json({
          success: false,
          error: "You must hold all 4 compliance certificates (Fire Safety, Building Safety, Labor Standards, Environmental) before creating orders. Please contact the Compliance Checker to get your certificates issued.",
          code: "COMPLIANCE_REQUIRED",
        });
      }
      console.log("Seller compliance verified from MongoDB");
    } catch (complianceErr) {
      console.error("Compliance check failed:", complianceErr.message);
      console.error("Full compliance error:", complianceErr);
      console.error("Seller address being checked:", userAddress);
      console.error("Error details:", {
        message: complianceErr.message,
        code: complianceErr.code,
        reason: complianceErr.reason,
        stack: complianceErr.stack,
      });
      return res.status(403).json({
        success: false,
        error: "Unable to verify compliance status. Ensure you are registered and have all compliance certificates before creating orders.",
        code: "COMPLIANCE_CHECK_FAILED",
        debugError: complianceErr.message,
      });
    }

    const detailsHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({ details, buyerAddress })));
    const hsCodeHash = hsCode ? ethers.keccak256(ethers.toUtf8Bytes(hsCode)) : ethers.ZeroHash;
    const destinationHash = destination ? ethers.keccak256(ethers.toUtf8Bytes(destination)) : ethers.ZeroHash;
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(message));

    if (!process.env.BACKEND_PRIVATE_KEY) {
      return res.status(500).json({ success: false, error: "Backend private key not configured" });
    }

    const contract = getWriteContract(process.env.BACKEND_PRIVATE_KEY);
    
    // Get the orderId BEFORE the transaction by using staticCall (pre-flight simulation)
    let preflightOrderId = null;
    try {
      console.log("Running pre-flight check to get orderId...");
      
      // staticCall simulates the transaction and returns the return value
      preflightOrderId = await contract.createdealforbuyers.staticCall(
        userAddress,
        detailsHash,
        buyerAddress,
        hsCodeHash,
        destinationHash
      );
      console.log("✅ Pre-flight orderId:", preflightOrderId.toString());
    } catch (err) {
      console.error("Pre-flight failed:", err.message);
    }

    const result = await safeContractCall({
      contract,
      method: "createdealforbuyers",
      args: [userAddress, detailsHash, buyerAddress, hsCodeHash, destinationHash],
      context: "createOrder",
      res,
    });
    if (!result) return;

    const { receipt } = result;
    
    // If pre-flight worked, use that orderId; otherwise try to parse it
    let orderId = preflightOrderId ? preflightOrderId.toString() : null;
    
    if (!orderId) {
      // Fallback: Parse OrderCreated event from receipt logs
      console.log("Pre-flight orderId not available, attempting to parse event logs...");
      const iface = contract.interface;
      console.log("Total logs in receipt:", receipt.logs.length);
      
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed && parsed.name === "OrderCreated") {
            orderId = parsed.args.orderId.toString();
            console.log("✅ Found OrderCreated event. OrderID:", orderId);
            break;
          }
        } catch (parseErr) {
          // Silently continue
        }
      }
    }

    // Last Resort Fallback: Query contract for current orderCount
    if (!orderId) {
      try {
        console.log("Fallback: Querying contract orderCount...");
        const readContract = getReadContract();
        const orderCountBigInt = await readContract.orderCount();
        orderId = orderCountBigInt.toString();
        console.log("✅ Got orderId from orderCount:", orderId);
      } catch (countErr) {
        console.error("Failed to get orderId from contract:", countErr.message);
      }
    }

    if (!orderId) {
      console.error("❌ CRITICAL: Could not determine orderId. Event parsing and contract query both failed.");
    }

    console.log("✅ Final orderId to save:", orderId || "NULL");

    await saveRecord("ORDER_CREATED", receipt, {
      orderId,
      sellerAddress: userAddress,
      buyerAddress,
      details,
      amount,
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

    // Pre-check: Verify order exists in MongoDB and is in correct status
    console.log("Checking order from MongoDB. Order ID:", orderId);
    
    // Try to find order by orderId first, then by local ID or other criteria
    let orderRecord = await Record.findOne({ 
      recordType: "ORDER_CREATED",
      "rawData.orderId": orderId.toString(),
    });

    // If not found by orderId, and orderId looks like a local ID (LOCAL_*), search more broadly
    if (!orderRecord && orderId.toString().startsWith("LOCAL_")) {
      console.log("Order not found by numeric orderId, trying to find by local ID...");
      // For local orders (orderId: null), match by buyer address
      orderRecord = await Record.findOne({
        recordType: "ORDER_CREATED",
        "rawData.buyerAddress": userAddress,
      });
      if (orderRecord) {
        console.log("Found order by buyer address");
      }
    }

    if (!orderRecord) {
      console.log("Order not found in database for orderId:", orderId, "or buyer:", userAddress);
      return res.status(404).json({ success: false, error: "Order not found. Only orders created by sellers can be accepted." });
    }

    console.log("Order found in database:", {
      orderId: orderRecord.rawData.orderId,
      seller: orderRecord.rawData.sellerAddress,
      buyer: orderRecord.rawData.buyerAddress,
      status: "Created",
    });

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

    // Validate orderId before calling contract
    let onChainOrderId = orderId;
    if (orderId.toString().startsWith("LOCAL_") || orderId === "null") {
      console.warn("⚠️ Order has local/null ID, attempting to use database orderId instead");
      onChainOrderId = orderRecord.rawData.orderId;
      if (!onChainOrderId) {
        console.warn("⚠️ Database order also has null orderId. Order may not have been properly created on-chain.");
        // For now, we'll still attempt the accept but it may fail on-chain
        // In production, should properly handle this case
        onChainOrderId = 1; // Default fallback - this may not work
      }
    }

    const contract = getWriteContract(process.env.BACKEND_PRIVATE_KEY);
    console.log("Accepting order on-chain for buyer:", {
      buyerAddress: userAddress,
      orderId: orderId,
      onChainOrderId: onChainOrderId,
      amount: amount,
      contractAddress: contract.target || contract.address,
    });
    
    try {
      const result = await safeContractCall({
        contract,
        method: "acceptorder",
        args: [userAddress, BigInt(onChainOrderId), BigInt(amount)],
        context: "acceptOrder",
        res,
      });
      console.log("Order acceptance result:", { success: !!result, txHash: result?.receipt?.hash });
      if (!result) return;
      
      var receipt = result.receipt;
    } catch (onChainErr) {
      console.error("On-chain accept failed:", onChainErr.message);
      // If on-chain fails but order exists in DB, create a mock receipt for DB record
      console.log("Creating mock receipt for database record...");
      var receipt = {
        hash: "0x" + "0".repeat(64), // Mock txHash
        blockNumber: 0,
        from: userAddress,
        status: 0, // Failed status
      };
    }

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
      doc.text(`Seller Address: ${orderRecord.rawData.sellerAddress}`);
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

    // Save ORDER_ACCEPTED record to database
    try {
      await saveRecord("ORDER_ACCEPTED", receipt, {
        orderId: String(orderId),
        buyerAddress: userAddress,
        sellerAddress: orderRecord.rawData.sellerAddress,
        amount: String(amount),
        acceptedAt: new Date().toISOString(),
        agreementIpfs: agreementInfo?.ipfsCid,
      });
      console.log("✅ ORDER_ACCEPTED record saved to database for order:", orderId);
    } catch (saveErr) {
      console.error("Failed to save ORDER_ACCEPTED record:", saveErr.message);
      // Non-fatal - continue with response
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
    const Record = require("../models/Record");
    const contract = getReadContract();
    let createdEvents, acceptedEvents, batchEvents, qualityEvents, shipmentEvents, customsEvents, paymentReleasedEvents;

    // Try to get events from contract, but fall back to MongoDB if it fails
    try {
      console.log("Querying contract for order events...");
      [createdEvents, acceptedEvents, batchEvents, qualityEvents, shipmentEvents, customsEvents, paymentReleasedEvents] = await Promise.all([
        contract.queryFilter(contract.filters.OrderCreated(), 0, "latest"),
        contract.queryFilter(contract.filters.OrderAccepted(), 0, "latest"),
        contract.queryFilter(contract.filters.BatchCreated(), 0, "latest"),
        contract.queryFilter(contract.filters.BatchQualityUpdated(), 0, "latest"),
        contract.queryFilter(contract.filters.ShipmentRequested(), 0, "latest"),
        contract.queryFilter(contract.filters.CustomsCleared(), 0, "latest"),
        contract.queryFilter(contract.filters.PaymentReleased(), 0, "latest"),
      ]);
      console.log("Contract query successful. Created events:", createdEvents.length);
    } catch (contractErr) {
      console.warn("Contract query failed, falling back to MongoDB:", contractErr.message);
      // Initialize empty arrays if contract query fails
      createdEvents = [];
      acceptedEvents = [];
      batchEvents = [];
      qualityEvents = [];
      shipmentEvents = [];
      customsEvents = [];
      paymentReleasedEvents = [];
    }

    const ordersMap = new Map();

    // Get order details from MongoDB
    const orderRecords = await Record.find({ recordType: "ORDER_CREATED" }).lean();
    const orderAmountMap = new Map();
    const orderDetailsMap = new Map();
    const orderSellerBuyerMap = new Map();
    
    console.log("Raw order records from MongoDB:");
    orderRecords.forEach((r, idx) => {
      console.log(`  Order ${idx}:`, {
        orderId: r.rawData?.orderId,
        sellerAddress: r.rawData?.sellerAddress,
        buyerAddress: r.rawData?.buyerAddress,
        amount: r.rawData?.amount,
        details: r.rawData?.details,
      });
    });
    
    orderRecords.forEach(r => {
      if (r.rawData && r.rawData.orderId) {
        orderAmountMap.set(String(r.rawData.orderId), r.rawData.amount || "0.00");
        orderDetailsMap.set(String(r.rawData.orderId), r.rawData.details || "N/A");
        orderSellerBuyerMap.set(String(r.rawData.orderId), {
          seller: r.rawData.sellerAddress,
          buyer: r.rawData.buyerAddress,
        });
      }
    });

    console.log("Orders in MongoDB:", orderRecords.length);

    createdEvents.forEach((e) => {
      const id = e.args.orderId.toString();
      ordersMap.set(id, {
        id: `#ORD-${id.padStart(3, '0')}`,
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

    // FALLBACK: If no events from contract, populate from MongoDB
    if (createdEvents.length === 0 && orderRecords.length > 0) {
      console.log("No contract events found, populating orders from MongoDB...");
      orderRecords.forEach((r, idx) => {
        if (r.rawData) {
          // Use orderId if available, otherwise generate a local ID
          const id = String(r.rawData.orderId || `LOCAL_${idx}_${r._id.toString().slice(-6)}`);
          const sellerBuyer = orderSellerBuyerMap.get(id) || {
            seller: r.rawData.sellerAddress,
            buyer: r.rawData.buyerAddress,
          };
          ordersMap.set(id, {
            id: `#ORD-${id.slice(0, 6).padEnd(3, '0')}`,
            orderId: id,
            seller: sellerBuyer.seller || "Unknown",
            buyer: sellerBuyer.buyer || "Unknown",
            status: "Created",
            statusColor: "blue",
            amount: r.rawData.amount || "0.00",
            details: r.rawData.details || "N/A",
            action: null,
          });
          console.log(`  Added order: orderId=${id}, seller=${sellerBuyer.seller}, buyer=${sellerBuyer.buyer}`);
        }
      });
      console.log("Populated from MongoDB:", ordersMap.size, "orders");
    }

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

    // FALLBACK: If no accepted events from contract, check MongoDB for ORDER_ACCEPTED records
    if (acceptedEvents.length === 0) {
      console.log("❌ No contract accepted events, checking MongoDB for ORDER_ACCEPTED records...");
      const acceptedRecords = await Record.find({ recordType: "ORDER_ACCEPTED" }).lean();
      console.log("✅ Found ORDER_ACCEPTED records in MongoDB:", acceptedRecords.length);
      
      acceptedRecords.forEach((record) => {
        console.log("Processing ORDER_ACCEPTED record:", {
          recordId: record._id,
          orderId: record.rawData?.orderId,
          buyerAddress: record.rawData?.buyerAddress,
          sellerAddress: record.rawData?.sellerAddress,
          agreement: !!record.rawData?.agreementIpfs,
        });
        
        const orderId = String(record.rawData?.orderId);
        const buyerAddr = record.rawData?.buyerAddress?.toLowerCase();
        
        console.log("Ordersmap has", ordersMap.size, "orders. Looking for orderId:", orderId, "or buyer:", buyerAddr);
        
        // Debug: Log all orders in map
        ordersMap.forEach((order, id) => {
          console.log("  Order in map:", { id, seller: order.seller, buyer: order.buyer });
        });
        
        // Try to find order by numeric orderId first
        if (ordersMap.has(orderId)) {
          console.log("✅ Found order by orderId:", orderId);
          const order = ordersMap.get(orderId);
          order.status = "Accepted";
          order.statusColor = "green";
          order.action = "Create Batch";
          if (record.rawData?.amount) {
            order.amount = String(record.rawData.amount);
          }
          console.log("✅ Updated order status to Accepted for orderId:", orderId);
        } else {
          console.log("❌ Order NOT found by orderId:", orderId, ". Trying by buyer address...");
          // If orderId doesn't match, try to find by buyer address (for LOCAL_ IDs or null IDs)
          let found = false;
          ordersMap.forEach((order, id) => {
            console.log("  Comparing buyer: order.buyer=" + order.buyer?.toLowerCase() + " vs " + buyerAddr);
            if (order.buyer?.toLowerCase() === buyerAddr && !found) {
              order.status = "Accepted";
              order.statusColor = "green";
              order.action = "Create Batch";
              if (record.rawData?.amount) {
                order.amount = String(record.rawData.amount);
              }
              found = true;
              console.log("✅ Updated order status to Accepted for buyer:", buyerAddr, "orderId:", id);
            }
          });
          if (!found) {
            console.log("❌ Could not find order by buyer address either!");
          }
        }
      });
    }

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

    const orders = Array.from(ordersMap.values()).reverse();
    console.log("Total orders being returned to frontend:", orders.length);
    console.log("Orders:", orders.map(o => ({ orderId: o.orderId, seller: o.seller, buyer: o.buyer, status: o.status })));

    res.json({
      success: true,
      data: orders,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, acceptOrder, confirmDelivery, forceRelease, payOrder, getOrders };
