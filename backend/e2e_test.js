/**
 * End-to-End Lifecycle Test — RMG Blockchain Platform v2
 * Correct lifecycle order based on smart contract analysis.
 */
const { ethers } = require("ethers");

const API = "http://localhost:3000/api";
const RPC = "http://127.0.0.1:8545";

// ── Anvil Accounts ──
const SELLER_PK     = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const BUYER_PK      = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
const CERTIFIER_PK  = "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6";
const QC_PK         = "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a";
const FF_PK         = "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba";
const EXPORT_PK     = "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e";
const IMPORT_PK     = "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356";
const COMPLIANCE_PK = "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97";

const SELLER_ADDR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const BUYER_ADDR  = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

// Read from .env
const fs = require("fs");
const envPath = require("path").resolve(__dirname, ".env");
const envContent = fs.readFileSync(envPath, "utf8");
const CONTRACT_ADDRESS = envContent.match(/CONTRACT_ADDRESS=(.+)/)?.[1]?.trim();
console.log("Contract address:", CONTRACT_ADDRESS);

// ABI for direct contract calls
const ABI = JSON.parse(fs.readFileSync(require("path").resolve(__dirname, "abi/MyContract.json"), "utf8"));

async function signPayload(privateKey, data) {
  const wallet = new ethers.Wallet(privateKey);
  const message = JSON.stringify(data);
  const signature = await wallet.signMessage(message);
  return { data, signature, userAddress: wallet.address };
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function post(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  await sleep(3000); // Prevent Ethereum nonce collision for backend wallet
  return data;
}

async function get(url) {
  const res = await fetch(url);
  return res.json();
}

function log(phase, result) {
  const status = result.success ? "✅" : "❌";
  console.log(`${status} ${phase}: ${result.message || result.error || JSON.stringify(result)}`);
  if (!result.success) console.log("   Detail:", JSON.stringify(result, null, 2));
  return result;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ════════════════════════════════════════════════════════════
async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  RMG BLOCKCHAIN — END-TO-END LIFECYCLE TEST v2");
  console.log("═══════════════════════════════════════════════════════════\n");

  // ┌─────────────────────────────────────────┐
  // │  Phase 1: Register Seller (Account 1)   │
  // └─────────────────────────────────────────┘
  console.log("── Phase 1: Seller Registration ──");
  const regPayload = await signPayload(SELLER_PK, { name: "BD Garments Ltd", tinid: 123456, number: 1800123456 });
  const regResult = log("Register Seller", await post(`${API}/sellers/register`, regPayload));
  if (!regResult.success) return;

  // ┌─────────────────────────────────────────┐
  // │  Phase 2: Register Buyer (Account 2)    │
  // └─────────────────────────────────────────┘
  console.log("\n── Phase 2: Buyer Registration ──");
  const buyerPayload = await signPayload(BUYER_PK, { name: "NYC Fashion Imports", license: "IMP-2024-NYC", contact: "+1-555-0199" });
  const buyerResult = log("Register Buyer", await post(`${API}/buyers/register`, buyerPayload));
  if (!buyerResult.success) return;

  // ┌─────────────────────────────────────────┐
  // │  Phase 3: Certifier Approves (Acct 3)   │
  // └─────────────────────────────────────────┘
  console.log("\n── Phase 3: Certifier Approval ──");
  const approveResult = log("Approve Seller", await post(`${API}/sellers/approve`, {
    sellerAddress: SELLER_ADDR, assign: 1, privateKey: CERTIFIER_PK,
  }));
  if (!approveResult.success) return;

  // ┌─────────────────────────────────────────┐
  // │  Phase 4: Compliance (4 certs, Acct 8)  │
  // └─────────────────────────────────────────┘
  console.log("\n── Phase 4: Compliance Issuance (4 certificates) ──");
  const expiresAt = Math.floor(Date.now() / 1000) + 31536000;
  const certDocHash = ethers.keccak256(ethers.toUtf8Bytes("compliance-document-hash"));
  const CERT_TYPES = ["Fire Safety", "Building Safety", "Labor Standards", "Environmental"];
  for (let i = 0; i < 4; i++) {
    const r = log(`Issue ${CERT_TYPES[i]}`, await post(`${API}/compliance/issue`, {
      sellerAddress: SELLER_ADDR, certType: i, certDocHash, expiresAt, privateKey: COMPLIANCE_PK,
    }));
    if (!r.success) return;
  }
  // Verify compliance
  const cs = await get(`${API}/compliance/${SELLER_ADDR}`);
  console.log(`   ✓ Compliance status: ${JSON.stringify(cs.compliance)}`);

  // ┌─────────────────────────────────────────┐
  // │  Phase 5: Create Order (Acct 1 → 2)     │
  // └─────────────────────────────────────────┘
  console.log("\n── Phase 5: Seller Creates Order ──");
  const orderPayload = await signPayload(SELLER_PK, {
    details: "10,000 RMG T-Shirts", buyerAddress: BUYER_ADDR, amount: "1000", hsCode: "6109.10", destination: "New York",
  });
  const orderRes = log("Create Order", await post(`${API}/orders`, orderPayload));
  if (!orderRes.success) return;
  const orderId = orderRes.orderId;
  console.log(`   Order ID: ${orderId}`);

  // ┌─────────────────────────────────────────┐
  // │  Phase 6: Buyer Accepts Order (Acct 2)  │
  // └─────────────────────────────────────────┘
  console.log("\n── Phase 6: Buyer Accepts Order ──");
  
  // First, Buyer must approve the contract to spend their USDT
  const providerApprove = new ethers.JsonRpcProvider(RPC);
  const buyerWalletApprove = new ethers.Wallet(BUYER_PK, providerApprove);
  const mockUsdtAbi = [
    "function approve(address spender, uint256 amount) external returns (bool)"
  ];
  const rootEnvPath = require("path").resolve(__dirname, "../.env");
  const rootEnvContent = fs.readFileSync(rootEnvPath, "utf8");
  const usdtAddress = rootEnvContent.match(/USDT_ADDRESS=(.+)/)?.[1]?.trim();
  const usdtContract = new ethers.Contract(usdtAddress, mockUsdtAbi, buyerWalletApprove);
  console.log("   Approving MockUSDT...");
  const approveTx = await usdtContract.approve(CONTRACT_ADDRESS, ethers.parseEther("1000000"));
  await approveTx.wait();

  const acceptPayload = await signPayload(BUYER_PK, { orderId: Number(orderId), amount: "1000" });
  const acceptRes = log("Buyer Accept", await post(`${API}/orders/${orderId}/accept`, acceptPayload));

  // ┌─────────────────────────────────────────┐
  // │  Phase 7: Create Batch (Acct 1)         │
  // └─────────────────────────────────────────┘
  console.log("\n── Phase 7: Seller Creates Batch ──");
  const batchPayload = await signPayload(SELLER_PK, { orderId: Number(orderId), productInfo: "Cotton T-Shirts 10K units" });
  const batchRes = log("Create Batch", await post(`${API}/batches`, batchPayload));
  if (!batchRes.success) return;
  const batchId = batchRes.batchId;
  console.log(`   Batch ID: ${batchId}`);

  // ┌─────────────────────────────────────────┐
  // │  Phase 8: Quality Check (Acct 4)        │
  // └─────────────────────────────────────────┘
  console.log("\n── Phase 8: Quality Check ──");
  const qcRes = log("QC Approve", await post(`${API}/batches/${batchId}/quality`, { status: true, privateKey: QC_PK }));
  if (!qcRes.success) return;

  // ┌─────────────────────────────────────────┐
  // │  Phase 9: Request Shipment (Acct 1)     │
  // └─────────────────────────────────────────┘
  console.log("\n── Phase 9: Seller Requests Shipment ──");
  const FF_ADDR = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"; // Account 5 from Anvil
  const shipPayload = await signPayload(SELLER_PK, { batchId: Number(batchId), freightForwarderAddress: FF_ADDR });
  const shipRes = log("Request Shipment", await post(`${API}/shipments`, shipPayload));
  if (!shipRes.success) return;
  const shipId = shipRes.shipId;
  console.log(`   Ship ID: ${shipId}`);

  // ┌─────────────────────────────────────────┐
  // │  Phase 10: Upload 4 Export Docs (Acct 5)│
  // │  Direct contract call (bypasses IPFS)   │
  // └─────────────────────────────────────────┘
  console.log("\n── Phase 10: Freight Forwarder Uploads 4 Export Docs (direct on-chain) ──");
  const provider = new ethers.JsonRpcProvider(RPC);
  const ffWallet = new ethers.Wallet(FF_PK, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, ffWallet);
  
  let currentNonce = await provider.getTransactionCount(ffWallet.address);
  
  const DOC_NAMES = ["CommercialInvoice", "PackingList", "BillOfLading", "CertificateOfOrigin"];
  for (let docType = 0; docType < 4; docType++) {
    const docHash = ethers.keccak256(ethers.toUtf8Bytes(`doc-${DOC_NAMES[docType]}-ship-${shipId}`));
    try {
      const tx = await contract.uploadExportDoc(BigInt(shipId), docType, docHash, { nonce: currentNonce++ });
      const receipt = await tx.wait();
      console.log(`✅ Upload ${DOC_NAMES[docType]}: tx ${receipt.hash.slice(0,18)}...`);
    } catch (err) {
      console.log(`❌ Upload ${DOC_NAMES[docType]}: ${err.message.slice(0,80)}`);
      return;
    }
  }

  // Verify all 4 docs uploaded
  const isReady = await contract.isExportReady(BigInt(shipId));
  console.log(`   ✓ Export docs complete: ${isReady}`);

  // ┌─────────────────────────────────────────┐
  // │  Phase 11: Export Customs (Acct 6)      │
  // └─────────────────────────────────────────┘
  console.log("\n── Phase 11: Export Customs Clearance ──");
  const expRes = log("Export Verify", await post(`${API}/shipments/${shipId}/export-verify`, { privateKey: EXPORT_PK }));
  if (!expRes.success) return;

  // ┌─────────────────────────────────────────┐
  // │  Phase 12: Import Customs (Acct 7)      │
  // └─────────────────────────────────────────┘
  console.log("\n── Phase 12: Import Customs Clearance ──");
  const impRes = log("Import Verify", await post(`${API}/shipments/${shipId}/import-verify`, { privateKey: IMPORT_PK }));
  if (!impRes.success) return;

  // ┌─────────────────────────────────────────┐
  // │  Phase 13: Buyer Confirms Delivery (2)  │
  // └─────────────────────────────────────────┘
  console.log("\n── Phase 13: Buyer Confirms Delivery → Escrow Released ──");
  const confirmPayload = await signPayload(BUYER_PK, { action: "confirm", orderId: Number(orderId) });
  confirmPayload.shipId = String(shipId);
  const deliveryRes = log("Confirm Delivery", await post(`${API}/orders/${orderId}/confirm-delivery`, confirmPayload));

  // ┌───────────────────────────────────────────┐
  // │  FINAL STATE CHECK                        │
  // └───────────────────────────────────────────┘
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  FINAL STATE CHECK");
  console.log("═══════════════════════════════════════════════════════════");
  
  const o = await get(`${API}/orders`);
  console.log(`📦 Orders: ${o.data?.length || 0}`);
  if (o.data?.[0]) {
    console.log(`   Order #${o.data[0].orderId} — Status: ${o.data[0].status} | Delivered: ${o.data[0].delivered}`);
  }

  const b = await get(`${API}/batches/events`);
  console.log(`🏭 Batches: ${b.data?.created?.length || 0} created, ${b.data?.quality?.length || 0} QC'd`);

  const s = await get(`${API}/shipments/events`);
  console.log(`🚢 Shipments: ${s.data?.length || 0}`);

  // Check on-chain escrow
  const readContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  const escrowed = await readContract.getEscrowed(BigInt(orderId));
  const orderStatus = await readContract.getOrderStatus(BigInt(orderId));
  console.log(`💰 Escrow remaining: ${escrowed.toString()} wei`);
  console.log(`📋 On-chain order: status=${orderStatus[0]}, delivered=${orderStatus[1]}, escrowed=${orderStatus[2].toString()}`);

  const r = await get(`${API}/records`);
  console.log(`📝 DB Records: ${r.data?.length || 0}`);

  const sellers = await get(`${API}/sellers/events`);
  console.log(`👤 Sellers: ${sellers.count}`);

  console.log("\n═══════════════════════════════════════════════════════════");
  if (deliveryRes.success && escrowed.toString() === "0") {
    console.log("  🎉 ALL PHASES PASSED — FULL LIFECYCLE COMPLETE!");
  } else {
    console.log("  ⚠️  SOME PHASES NEED ATTENTION");
  }
  console.log("═══════════════════════════════════════════════════════════");
}

main().catch(console.error);
