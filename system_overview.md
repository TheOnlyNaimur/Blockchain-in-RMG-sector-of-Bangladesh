# System Overview

## 1. Project Summary

This project implements a blockchain-backed trade workflow platform for the Ready-Made Garment (RMG) sector in Bangladesh. It combines:

- On-chain state control and escrow settlement using a Solidity smart contract.
- Off-chain business data persistence, indexing, and reporting through a Node.js/Express + MongoDB backend.
- A role-based React frontend for all stakeholders in the export lifecycle.

The core objective is to enforce trust, compliance, and traceability across the order-to-shipment-to-settlement pipeline.


## 2. High-Level Architecture

The system uses a hybrid architecture with three primary layers.

### 2.1 On-chain Layer (Solidity / Foundry)

- Main contract: src/MyContract.sol.
- Manages role-gated workflow transitions and immutable event trail.
- Holds escrowed PYUSD until delivery confirmation or authorized force-release.
- Stores hashes and compact state, not full business documents.

### 2.2 Backend Layer (Node.js / Express / MongoDB)

- Entry point: backend/server.js.
- API namespace: /api via backend/routes/index.js.
- Controllers orchestrate signature verification, contract calls, persistence, and audit endpoints.
- MongoDB stores record snapshots with tx metadata and integrity hashes for fast reads and timeline queries.

### 2.3 Frontend Layer (React / Vite / Wagmi / Ethers)

- Entry routes: frontend/src/App.jsx.
- Wallet-driven role routing with guarded dashboards.
- Role-specific operational UIs for seller, buyer, certifier, QC, freight, customs, compliance.
- Public transaction/audit visibility through dedicated pages.


## 3. Repository Structure

- src/: Solidity contracts.
- script/: Foundry deployment scripts.
- backend/: API server, controllers, routes, DB model, ABI copy.
- frontend/: React app, pages, hooks, API client modules.
- deploy.sh: one-command deploy + env/ABI propagation.
- foundry.toml and remappings.txt: Foundry build/remapping configuration.


## 4. Smart Contract Design

### 4.1 Contract and Roles

The contract constructor takes fixed role addresses and token address:

- certifier
- quality checker
- freight forwarder
- export customs
- import customs
- compliance checker
- PYUSD token address (legacy env key name remains USDT_ADDRESS)

Role checks are enforced with explicit guards and custom errors.

### 4.2 Core Domain Entities

- Seller: registration state, identity fields, cert hash.
- Buyer: registration state and data hash.
- Order: seller, buyer, details hash, HS/destination hashes, escrow, status, delivered flag.
- Batch: order linkage, product info hash, QC flag.
- Shipment: batch linkage, customs status, freight actor, export doc anchors.
- Compliance certificates: four required compliance categories per seller.

### 4.3 Workflow and State Transitions

1. Seller and buyer register.
2. Certifier approves seller.
3. Compliance checker issues required certificates.
4. Seller creates order.
5. Buyer accepts order and escrows PYUSD.
6. Seller creates batch.
7. Quality checker approves/rejects batch.
8. Seller requests shipment.
9. Freight uploads required export documents.
10. Export customs clears shipment.
11. Import customs clears shipment.
12. Buyer confirms delivery (or import customs force-releases) and escrow is released.

### 4.4 Traceability Model

Every major state change emits TraceEvent(orderId, eventType, actor, timestamp, dataHash), enabling a complete on-chain audit timeline.


## 5. Backend System Design

### 5.1 Runtime

- Framework: Express.
- Blockchain SDK: ethers v6.
- Database: Mongoose + MongoDB.
- File ingestion: multer.
- PDF generation: pdfkit.
- IPFS integration: Pinata SDK.

### 5.2 API Modules

- /api/sellers: seller registration, approval, certificates, seller events.
- /api/buyers: buyer registration, seller status for buyers.
- /api/orders: create, accept, pay, confirm delivery, force-release, hydrated order list.
- /api/batches: create batch, QC result, batch events.
- /api/shipments: request shipment, upload docs, customs verify, shipment events/details.
- /api/compliance: issue/revoke certificates, seller compliance status.
- /api/records: record listing, tx-based fetch, integrity verification, type summary.
- /api/audit: full trail, order timeline, export readiness checks.

### 5.3 Record Persistence

Record schema fields:

- recordType
- txHash
- blockNumber
- dataHash
- rawData
- contractFeedback
- timestamps

This supports hybrid traceability:

- Immutable chain truth for final state and event integrity.
- Fast query and UI hydration from MongoDB.

### 5.4 Status Hydration Strategy

Order and batch dashboards are built from:

1. Preferred path: on-chain event queries.
2. Fallback path: record-driven reconstruction.

Fallback reconstruction has been extended to include cross-entity linking (batchId->orderId, shipId->orderId) and downstream lifecycle events so UI state remains accurate even when RPC log queries are constrained.

### 5.5 RPC Constraint Handling

Some public RPC providers reject wide eth_getLogs ranges. The backend now uses bounded query windows where needed and falls back to DB-based event snapshots when log queries fail.


## 6. Frontend System Design

### 6.1 Routing and RBAC

Routes are defined in frontend/src/App.jsx and wrapped with RoleGuard for role-specific access.

Key route groups:

- Registration and wallet connect.
- Seller dashboard.
- Buyer dashboard.
- Certifier panel.
- Compliance panel.
- QC review panel.
- Freight and customs panels.
- Traceability and ledger views.

### 6.2 Wallet and Signing Model

- Frontend collects business payloads.
- User signs payloads with wallet.
- Backend verifies signature before executing role-sensitive contract calls.

This ensures request authenticity and signer-address consistency.

### 6.3 Dashboard Data Flow

- Frontend hooks fetch from backend API endpoints.
- Backend provides hydrated status arrays (orders, batches, shipment timeline).
- Local optimistic updates are merged with refetch to converge on chain-backed state.


## 7. Escrow and Token Model

The system is currently configured for PYUSD behavior (6 decimals). Contract/env key names still use historical USDT naming for compatibility:

- USDT_ADDRESS in backend/root env.
- VITE_USDT_ADDRESS in frontend env.

Operationally this address points to the intended PYUSD token contract in deployment.


## 8. Deployment and Configuration

### 8.1 Contract Deployment

- script/Deploy.s.sol deploys MyContract with role addresses and token address from env.
- deploy.sh builds, deploys, extracts contract address, updates env files, and refreshes backend ABI copy.

### 8.2 Environment Surfaces

Root .env:

- PRIVATE_KEY
- RPC_URL
- CONTRACT_ADDRESS
- USDT_ADDRESS
- role addresses

backend/.env:

- CONTRACT_ADDRESS
- RPC_URL
- MONGO_URI
- BACKEND_PRIVATE_KEY
- role private keys

frontend/.env:

- VITE_CONTRACT_ADDRESS
- VITE_USDT_ADDRESS
- VITE_CHAIN_ID / VITE_RPC_URL
- role addresses

### 8.3 Foundry Import Resolution

Foundry import resolution requires remapping for forge-std. Current setup includes:

- foundry.toml remapping for forge-std.
- remappings.txt with forge-std and openzeppelin mappings.


## 9. Security and Integrity Controls

- Role-gated contract functions with strict modifier checks.
- Custom error usage for explicit revert semantics.
- Backend signature verification for user-submitted operations.
- Hash anchoring for business payload integrity.
- Record-level dataHash + tx metadata for tamper detection and auditability.


## 10. Testing and Verification

### 10.1 Smart Contract

- Foundry build/test pipeline.

### 10.2 Backend

- Jest + Supertest tests for controllers.

### 10.3 End-to-End Scripted Flow

- reset_and_test.sh exists for environment reset + deployment + lifecycle checks in local/testing contexts.


## 11. Known Operational Characteristics

- Public RPC log range limitations can affect event queries if unbounded.
- Fallback record reconstruction is necessary for stable dashboard behavior under RPC constraints.
- Legacy naming (USDT keys) remains in env/config while token operations are PYUSD-oriented.


## 12. Recommended Next Enhancements

- Normalize token naming from USDT to PYUSD across env keys and config objects.
- Introduce dedicated projection collections for order_status and batch_status for O(1) dashboard reads.
- Add background reconciliation jobs that periodically re-sync DB projections from chain checkpoints.
- Add API-level structured status enums to reduce UI string coupling.
- Expand integration tests to include RPC-failure fallback scenarios.

