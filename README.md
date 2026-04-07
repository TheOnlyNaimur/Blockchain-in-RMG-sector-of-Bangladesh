# Blockchain Unified Platform for the RMG Sector in Bangladesh

## Overview

This repository contains a full-stack blockchain workflow platform for the Ready-Made Garment (RMG) export ecosystem in Bangladesh.

The platform combines:

- Solidity smart contract state enforcement (roles, compliance gates, escrow, lifecycle status)
- Express + MongoDB backend services (signature verification, record persistence, API orchestration)
- React frontend dashboards for each role in the supply chain

The system is designed around three goals:

- Trust: immutable state transitions and role-gated actions
- Compliance: mandatory certification and export document checks
- Traceability: full lifecycle auditability from registration to settlement


## Current Token Model

The active escrow model is configured for PYUSD-style behavior (6 decimals).

Important compatibility note:

- Environment keys still use historical USDT naming:
   - USDT_ADDRESS (backend/root)
   - VITE_USDT_ADDRESS (frontend)
- These keys now point to the configured PYUSD contract address used by the system.


## Architecture

### 1) On-chain Layer (Solidity)

Core contract: src/MyContract.sol

Responsibilities:

- Seller and buyer registration
- Role-based authorization (certifier, QC, freight, customs, compliance checker)
- Order creation and buyer acceptance with escrow transferFrom
- Batch creation with compliance gate
- Quality check, shipment request, document anchoring, customs clearances
- Escrow release on delivery confirmation (or force-release by import customs)
- TraceEvent emission for audit trail

### 2) Backend Layer (Node.js/Express/MongoDB)

Core server: backend/server.js

Responsibilities:

- API surface under /api
- Signature verification for user payloads
- Contract interaction via ethers v6
- Record persistence for fast dashboard hydration and audit queries
- Fallback status reconstruction when event log retrieval is constrained by RPC providers

### 3) Frontend Layer (React/Vite)

Core app: frontend/src/App.jsx

Responsibilities:

- Wallet-based role routing and guarded pages
- Role dashboards: Seller, Buyer, Certifier, Compliance, QC, Freight, Customs
- Traceability and ledger-style operational visibility
- API-driven status synchronization with optimistic UI updates


## Role Matrix

- Certifier: approves/rejects seller onboarding
- Compliance Checker: issues/revokes compliance certificates
- Seller: creates orders, batches, shipment requests
- Buyer: accepts orders, escrows funds, confirms delivery
- Quality Checker: approves/rejects batches
- Freight Forwarder: uploads shipment documents
- Export Customs: export verification
- Import Customs: import verification and emergency escrow release


## End-to-End Lifecycle

1. Seller registration
2. Buyer registration
3. Seller approval by certifier
4. Compliance certificate issuance
5. Order creation by seller
6. Order acceptance by buyer with escrow lock
7. Batch creation by seller
8. QC approval/rejection
9. Shipment request
10. Export document uploads
11. Export customs clearance
12. Import customs clearance
13. Buyer delivery confirmation (or force-release)
14. Escrow release to seller


## Repository Layout

```text
.
├── src/                         # Solidity contracts
│   ├── MyContract.sol
│   └── MockUSDT.sol             # optional local/mock token utilities
├── script/
│   └── Deploy.s.sol             # Foundry deployment script
├── backend/
│   ├── server.js
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── abi/
│   └── tests/
├── frontend/
│   ├── src/pages/
│   ├── src/hooks/
│   ├── src/api/
│   └── src/config/
├── deploy.sh                    # build + deploy + env + ABI sync
├── reset_and_test.sh            # local reset and scripted e2e flow
├── foundry.toml
└── remappings.txt
```


## Prerequisites

- Node.js 18+
- npm
- Foundry (forge, cast, anvil)
- MongoDB instance (local or Atlas)
- MetaMask or compatible EVM wallet


## Installation

```bash
git clone https://github.com/TheOnlyNaimur/Blockchain-in-RMG-sector-of-Bangladesh.git
cd Blockchain-in-RMG-sector-of-Bangladesh

cd backend && npm install
cd ../frontend && npm install
cd ..
```


## Environment Configuration

Use .env.example as a template and configure three scopes:

1. Root .env

- PRIVATE_KEY
- RPC_URL
- USDT_ADDRESS
- role addresses
- CONTRACT_ADDRESS (auto-filled by deploy.sh)

2. backend/.env

- RPC_URL, CONTRACT_ADDRESS
- MONGO_URI
- BACKEND_PRIVATE_KEY
- role private keys
- pinning/IPFS credentials

3. frontend/.env

- VITE_CONTRACT_ADDRESS
- VITE_USDT_ADDRESS
- VITE_CHAIN_ID, VITE_RPC_URL
- role addresses


## Deploy Contracts and Sync App Config

Recommended path:

```bash
./deploy.sh
```

The script performs:

- forge build
- forge script deployment
- contract address extraction from Foundry broadcast
- root/backend/frontend env updates
- backend ABI refresh (backend/abi/MyContract.json)


## Run the Platform

### Backend

```bash
cd backend
npm run dev
```

### Frontend

```bash
cd frontend
npm run dev
```

### Optional local chain (Anvil)

```bash
anvil
```


## Key API Domains

- /api/sellers
- /api/buyers
- /api/orders
- /api/batches
- /api/shipments
- /api/compliance
- /api/records
- /api/audit


## Data Integrity Model

The backend stores normalized event records in MongoDB using recordType, txHash, block metadata, rawData, and dataHash.

This supports:

- Efficient dashboard reads
- Historical audit trails
- Integrity checks against on-chain outcomes


## Operational Notes

### RPC log range limits

Some public RPC providers reject very wide eth_getLogs ranges.

The backend includes:

- bounded event query windows
- DB-backed fallback reconstruction for order/batch statuses

This is required for stable dashboard state in production-like public RPC conditions.

### Status hydration

Order status in the API is reconstructed from both live events and persisted records with cross-linking:

- batchId -> orderId
- shipId -> orderId

This ensures buyer/seller/QC/freight/customs dashboards remain consistent even during RPC event-query failures.


## Testing

### Smart contract build

```bash
forge build
```

### Backend tests

```bash
cd backend
npm test
```

### Local scripted flow

```bash
chmod +x reset_and_test.sh
./reset_and_test.sh
```


## Troubleshooting

### forge-std import not found in editor

If script/Deploy.s.sol shows:

Source forge-std/Script.sol not found

Ensure:

- foundry.toml includes forge-std remapping
- remappings.txt exists with forge-std path
- lib/forge-std is present
- Reload VS Code window after remapping updates

### Dashboard status appears stale

- Confirm backend is restarted after controller changes
- Verify /api/orders and /api/batches/events return success payloads
- Check RPC endpoint health and block-range restrictions


## Security Notes

- Role-restricted contract calls enforced on-chain
- User payload signature verification in backend
- Custom errors mapped to user-readable API responses
- Data hash persistence for tamper detection


## Academic Scope

This project is a research/prototype implementation for the Bangladesh RMG trade domain.
It is not a final audited production system and should undergo full smart contract and infrastructure security review before real-world deployment.

