# Blockchain Based Unified Platform for RMG Sector in Bangladesh

## 🎯 Project Overview

A comprehensive, blockchain-based supply chain mapping and tracking system exclusively designed for the Ready-Made Garment (RMG) sector in Bangladesh. The system enforces strict compliance, transparency, traceability, and accountability throughout the entire export supply chain. 

It accomplishes this via a **hybrid infrastructure**: smart contracts ensure immutable cryptographic proof-of-truth and automate financial escrows (USDT) on-chain, while a fast scalable MongoDB database handles large business documents, arrays, and PDF IPFS hashes off-chain.

**Thesis Stage: Implementation** - The culmination of system design, actor networking, and distributed systems research.

---

## 🏗️ Architecture

### Hybrid Model: Blockchain + MongoDB

- **Smart Contract (On-Chain)**: Stores deterministic state machines, authorization roles, IPFS dataset hashes, and mathematical proofs ensuring actors strictly follow RMG procedure.
- **MongoDB (Off-Chain)**: Provides sub-second query fetching for raw, unhashed complex JSON business data, arrays, historical events, and UX-friendly analytics.
- **Hashing Layer**: AES/SHA-256 generation ensures sensitive RMG business data stays completely off-chain, while still retaining cryptographic immutability (if data is altered, the hash breaks).
- **Automated Financials**: Escrow-based token movement ensures factories get paid their USDT immediately upon successful import clearance by a validated customs address, effectively solving default payment risk.
- **Cost Effectiveness**: Gas fee mitigation via local execution environments (`anvil`), perfect for enterprise resource planning (ERP) cost structures in Bangladesh.

---

## 🛠️ Technology Stack

### Smart Contracts & Web3
- **Solidity ^0.8.20** - Immutable logic layer.
- **Foundry / Forge** - Lightning-fast Rust-based testing and compiling suite.
- **Anvil** - Local blockchain RPC node for deterministic environment testing.

### Backend Network
- **Node.js + Express.js** - Highly concurrent non-blocking API interface.
- **Ethers.js v6** - Elliptic curve cryptography mapping and transaction broadcasting.
- **Mongoose** - Document-oriented modeling.

### Frontend Client
- **React 18 & Vite** - High-speed hot modular replacement and rendering.
- **TailwindCSS** - Responsive dark-mode styling.
- **Wagmi / Viem** - Robust modern React wallet connectivity hooks.
- **jsPDF / AutoTable** - Immutable transaction and official compliance certificate PDF exports.

---

## 📁 System Structure

```text
.
├── src/                       # Smart contracts (Solidity)
│   ├── MyContract.sol         # Main RMG State Machine & Workflow Contract
│   └── MockUSDT.sol           # ERC-20 implementation for automated escrow 
├── script/                    # Auto-deployment workflows
├── backend/                   
│   ├── server.js              # Express HTTP Server
│   ├── controllers/           # Specific Logic: Buyers, Sellers, QC, Audit, Compliance
│   ├── routes/                # Modular internal API
│   ├── e2e_test.js            # Automated End-To-End Blockchain Testing script
│   └── package.json           
├── frontend/                  
│   ├── src/pages/             # Role-based dashboards (Rbac layout)
│   ├── src/hooks/             # Ethers and Wagmi state synchronization
│   ├── src/utils/             # Cryptography and PDF generations
│   └── package.json           
├── reset_and_test.sh          # Ultimate bash command to burn, deploy, and E2E test everything
└── foundry.toml               # Native Forge configuration
```

---

## �� Quick Start & Installation Flow

### 1. Hard Prerequisites
Ensure you have the following perfectly installed globally:
- **Node.js (v18+)**
- **Foundry** (`curl -L https://foundry.paradigm.xyz | bash`)
- **Git**
- **MetaMask** Browser Extension (Set to Developer Mode)
- **MongoDB** (Locally installed `mongod` or via an Atlas connection string)

### 2. Initialization
Clone the repository and install dependency webs:

```bash
git clone https://github.com/TheOnlyNaimur/Blockchain-in-RMG-sector-of-Bangladesh.git
cd Blockchain-in-RMG-sector-of-Bangladesh

# Setup backend environment
cd backend 
npm install

# Setup frontend environment
cd ../frontend 
npm install
```

### 3. Environment Variable Injection
At the absolute root of your project, you'll need a `.env` file that handles all the private keys from Anvil's ephemeral state:

```bash
# In the project root, create `.env`
touch .env
```
Populate the file with the `anvil` generated private keys. Ensure that the deployment addresses strictly match the roles inside `./backend/.env` and `./frontend/src/config/contracts.js`.

---

## 🚢 Service Execution

For the entire system to sync, you need essentially four terminal instances running concurrently.

**Terminal 1: Start the Local Node**
```bash
anvil
```

**Terminal 2: Broadcast the Smart Contracts**
```bash
forge compile
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```
*(Copy the deployed `MyContract` and `MockUSDT` addresses generated in the terminal and assign them into your frontend configs).*

**Terminal 3: Ignite Database & Backend Routing**
```bash
cd backend
npm run dev
```

**Terminal 4: Spin-Up the User Interface**
```bash
cd frontend
npm run dev
```

### 5. Metamask Wallet Tethering
1. Open MetaMask. Go to Settings -> Networks -> Add Network Manually.
2. Network Name: **Anvil Local**
3. New RPC URL: `http://127.0.0.1:8545`
4. Chain ID: `31337`
5. Currency Symbol: `ETH`
6. Once saved, import Account #1 and Account #2 from your `anvil` terminal output via their raw Private Keys to test the Buyer and Seller transactions.

---

## 🎭 Roles & Permissions (RBAC)

The entire system strictly operates dynamically based on which active Wallet is connected. Random addresses have zero authorization to manipulate state.

| Role                  | Workflow Capabilities                                                     |
| --------------------- | ------------------------------------------------------------------------- |
| **Certifier**         | Approves/Rejects initial Factory Registrations & Tax IDs.                 |
| **Compliance Checker**| Evaluates & issues mandatory certificates (Fire, Labor, Environment).      |
| **Seller/Factory**    | Submits KYC, creates RMG Batches, requests container shipments.           |
| **Buyer/Brand**       | Deposits USDT into escrow, dictates Batch requirements, confirms delivery.|
| **Quality Checker**   | Audits physical garments and digitally signs `QC_PASSED` or `QC_FAILED`.  |
| **Freight Forwarder** | Uploads IPFS transit documents & anchors them onto immutable ledger.      |
| **Export Customs**    | Evaluates out-bound freight and issues blockchain export clearance.       |
| **Import Customs**    | Evaluates in-bound freight, triggers final clearance & releases Escrow.   |

---

## 🔄 The Complete Production Flow & Estimated Transaction Costs

The system relies on an immutable on-chain backend. Because operations manipulate state to ensure cryptographic trust, each step incurs a standard EVM block-space execution cost (Gas). 

> *Note: Gas estimations below are approximated from deterministic execution profiling. USD mappings (if calculated) scale dynamically based on the parent EVM Chain used (e.g. Polygon, Arbitrum, Ethereum L1) and current Gas/Gwei averages.*

| Phase | Step | Actor / Role | Blockchain Event / Action | Est. Gas Used | EVM Native Cost Estimate |
|:---|:---|:---|:---|---:|---:|
| **1. Factory Enrollment** | KYC Submission | Seller/Factory | `SellerRegistered` (ECDSA signed profile mapping) | ~97,094 | Low |
| | Registration Approval | Certifier | `SellerApproved` (Changes Factory state to *Approved*) | ~57,173 | Very Low |
| **2. ESG Compliance** | Safety Verifications | Compliance Checker | `ComplianceIssued` (e.g., Fire, Building, Labor, Env.) | ~97,496 / cert | Low |
| **3. Deal Initialization** | Purchase Order Mapping | Buyer/Brand | `OrderCreated` (Locks escrow, maps HS codes & terms) | ~190,487 | Medium |
| | Anchoring Agreements | API Relayer | `AgreementGenerated` (Anchors IPFS metadata) | ~83,269 | Low |
| **4. Manufacturing Base** | Production Batching | Seller/Factory | `BatchCreated` (Mints tracking id for raw garments) | ~138,068 | Medium |
| **5. Auditing Phase** | Quality Control Check | Quality Checker | `BatchQualityUpdated` (Pass/Fail deterministic flag) | ~36,413 | Very Low |
| **6. Export Logistics** | Freight Handshake | Factory / Forwarder | `ShipmentRequested` (Links batch to logistics carrier) | ~139,331 | Medium |
| | Shipping Docs Upload | Freight Forwarder | `ExportDocUploaded` (IPFS hashes of BoL, Invoices) | ~66,494 / doc | Low |
| **7. Final Clearance** | Export Validation | Export Customs | `CustomsCleared` (Verifies physical departure) | ~90,500 | Low |
| | Import & Settlement | Import Customs | `CustomsCleared` / `PaymentReleased` (Escrow unlock)| ~150,000 | Medium |

### Step-by-Step Flow Outline:
1. **KYC Submissions**: The Seller executes KYC protocols via digital signature.
2. **Platform Approval**: The Certifier validates the credentials and triggers `approve` on-chain.
3. **Compliance Safety**: The Compliance Checker manually inputs safety certificates via IPFS (Pinata). The system natively blocks any factory without Building, Labor, Fire, & Environmental safety certificates from doing business.
4. **Purchase Order**: The International Buyer submits a Purchase Order mapping and locks their fiat/USDT valuation fully into the Smart Contract Escrow. 
5. **Manufacturing**: Once escrow is locked, the Seller begins physical manufacturing and generates a cryptographic "Batch" linked to the Order.
6. **QC Authority Review**: The third-party Quality Checker inspects the physical goods, and cross-references the dataset on-chain. They approve/reject.
7. **Logistics Handshake**: The Seller passes the goods to the Freight Forwarder, who uploads the Bill of Lading and Certificate of Origin hashes onto IPFS, binding the CID hashes onto the EVM ledger.
8. **Public Ledger**: Any transaction, document hash, and receipt is immediately pushed to the **Public Transaction Ledger**, accessible to all users for complete transparency without needing to authenticate or connect a web3 wallet.
8. **Export / Import Gateways**: Local Bangladesh Customs flags it as `Export cleared`, and Receiving Customs flags it as `Import Cleared`.
9. **Execution & Release**: The Buyer reviews arrival status. When delivery is confirmed mutually on-chain, the frozen USDT escrow is atomically funneled into the Seller's address.
10. **Traceability Finality**: Every single execution is logged natively to the `TraceabilityDashboard`. Users can click "Download Audit" to pull verifiable timestamps natively exported into a PDF array.

---

## 🤖 Automated End-To-End Testing

Don't want to click through 15 wallets natively? We wrote a script that literally validates, compiles, and simulates the entire cycle via Node cryptography. 

```bash
# In the root, give execution permissions to the script
chmod +x reset_and_test.sh

# Run the 14-Phase Autonomous Pipeline
./reset_and_test.sh
```
This drops the MongoDB test-db, resets the Anvil node, dynamically reads all generated environment keys, compiles and deploys the contracts via forge, hooks into the API interfaces, tests JSON payloads, simulates full supply chain token transfers, and forces the E2E output locally!

### Example E2E Pipeline Output
When the script finishes executing, you will see a unified terminal pipeline confirming the lifecycle blocks have executed accurately on your local node:

```text
═══════════════════════════════════════════════════════════
  RMG BLOCKCHAIN — END-TO-END LIFECYCLE TEST v2
═══════════════════════════════════════════════════════════

── Phase 1: Seller Registration ──
✅ Register Seller: {"success":true,"message":"Seller registered successfully"}

── Phase 2: Buyer Registration ──
✅ Register Buyer: {"success":true,"message":"Buyer registered successfully"}

── Phase 3: Certifier Approval ──
✅ Approve Seller: {"success":true,"txHash":"0x..."}

── Phase 4: Compliance Issuance (4 certificates) ──
✅ Issue Fire Safety: {"success":true,...}
✅ Issue Building Safety: {"success":true,...}
   ✓ Compliance status: ["Fire Safety","Building Safety","Labor Standards","Environmental"]

── Phase 5: Seller Creates Order ──
✅ Create Order: {"success":true,"orderId":1}
   Order ID: 1

── Phase 6: Buyer Accepts Order ──
   Approving MockUSDT...
✅ Buyer Accept: {"success":true,...}

── Phase 7: Seller Creates Batch ──
✅ Create Batch: {"success":true,"batchId":1}
   Batch ID: 1

── Phase 8: Quality Check ──
✅ QC Approve: {"success":true,...}

── Phase 9: Seller Requests Shipment ──
✅ Request Shipment: {"success":true,"shipId":1}
   Ship ID: 1

── Phase 10: Freight Forwarder Uploads 4 Export Docs ──
✅ Upload CommercialInvoice: tx 0x...
✅ Upload PackingList: tx 0x...
✅ Upload BillOfLading: tx 0x...
✅ Upload CertificateOfOrigin: tx 0x...
   ✓ Export docs complete: true

── Phase 11: Export Customs Clearance ──
✅ Export Verify: {"success":true,...}

── Phase 12: Import Customs Clearance ──
✅ Import Verify: {"success":true,...}

── Phase 13: Buyer Confirms Delivery → Escrow Released ──
✅ Confirm Delivery: {"success":true,"message":"Delivery confirmed and escrow released"}

═══════════════════════════════════════════════════════════
  FINAL STATE CHECK
═══════════════════════════════════════════════════════════
📦 Orders: 1
   Order #1 — Status: Delivered | Delivered: true
🏭 Batches: 1 created, 1 QC'd
🚢 Shipments: 1
💰 Escrow remaining: 0 wei
📋 On-chain order: status=3, delivered=true, escrowed=0
📝 DB Records: 15
👤 Sellers: 1

═══════════════════════════════════════════════════════════
  🎉 ALL PHASES PASSED — FULL LIFECYCLE COMPLETE!
═══════════════════════════════════════════════════════════
```

---

## 🔐 Cryptography & Security
- **Strict Method Modifiers**: Smart contract arrays leverage `onlyRole` execution stopping state fragmentation.
- **Impeccable Signatures**: Utilizing `ECDSA` and Ethers v6 signature verifications prevents man-in-the-middle attacks. The database explicitly compares `signer` addresses.
- **Re-Entrancy Prevention**: Nonce parameters are utilized on token execution transfers.

---

## Academic Integrity
This is strictly a prototype mapped for academic research within the purview of the RMG (Ready Made Garment) export framework of Bangladesh. It requires rigorous third-party mainnet Solidity auditing mechanisms before massive deployment in enterprise ecosystems.

