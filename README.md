# Blockchain Based Unified Platform for RMG Sector in Bangladesh

## 🎯 Project Overview

A blockchain-based supply chain tracking system for the Ready-Made Garment (RMG) sector in Bangladesh. The system ensures transparency, traceability, and accountability throughout the entire supply chain using a **hybrid architecture**: smart contracts for proof-of-truth on-chain, MongoDB for detailed business data off-chain.

**Phase 3: Implementation** - Building upon Phase 2 research and design.

---

## 🏗️ Architecture

### Hybrid Model: Blockchain + MongoDB

- **Smart Contract (On-Chain)**: Stores hashes and essential identifiers for verification
- **MongoDB (Off-Chain)**: Stores raw business data, details, and contract feedback
- **Hashing Layer**: SHA-256 hashes ensure data integrity without privacy compromise
- **Privacy**: Sensitive RMG business data stays off-chain
- **Scalability**: Fast queries via MongoDB, proof-of-truth via blockchain
- **Cost**: Minimal on-chain data reduces gas fees (ideal for RMG businesses in Bangladesh)

---

## 🛠️ Technology Stack

### Smart Contracts & Blockchain

- **Solidity ^0.8.20** - Smart contract language
- **Foundry** - Solidity development toolkit
- **Anvil** - Local blockchain for development
- **Sepolia/Anvil** - Testnet/Local deployment

### Backend

- **Node.js + Express** - REST API server
- **Ethers.js v6** - Ethereum interactions
- **Mongoose** - MongoDB ORM
- **USDT** - ERC-20 payment token

### Frontend

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Wagmi + Viem** - Web3 hooks and utilities
- **MetaMask** - Wallet integration
- **Tailwind CSS** - Styling
- **Vite** - Build tool

---

## 📁 Project Structure

```
.
├── src/                       # Smart contracts (Solidity)
│   ├── MyContract.sol        # Main RMG supply chain contract
│   └── Contract.sol          # Legacy/alternate contract
├── script/
│   └── Deploy.s.sol          # Deployment script for Anvil
├── backend/
│   ├── server.js             # Express server
│   ├── config/               # Contract & DB config
│   ├── routes/               # API endpoints
│   ├── controllers/          # Business logic
│   ├── models/               # MongoDB schemas
│   ├── middleware/           # Error handling
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── config/          # Contract addresses & config
│   │   ├── pages/           # React pages (by role)
│   │   ├── components/      # Reusable components
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.ts
├── .env.example              # Deployment environment template
├── foundry.toml              # Foundry config
├── SETUP.md                  # Complete setup guide
└── DEPLOYMENT_CHECKLIST.md   # Pre-deployment checklist
```

---

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+
- Foundry
- MongoDB (local or Atlas)
- MetaMask browser extension

### 2. Clone & Install

```bash
git clone https://github.com/TheOnlyNaimur/Blockchain-in-RMG-sector-of-Bangladesh.git
cd Blockchain-in-RMG-sector-of-Bangladesh

# Install backend & frontend dependencies
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configure Environment

```bash
# Copy environment templates
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit .env files with your addresses and RPC URL
# See SETUP.md for detailed instructions
```

### 4. Start Services

**Terminal 1: Start Anvil (Local Blockchain)**

```bash
anvil
```

**Terminal 2: Deploy Smart Contract**

```bash
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
# Copy contract address to .env files
```

**Terminal 3: Start Backend**

```bash
cd backend
npm run dev
```

**Terminal 4: Start Frontend**

```bash
cd frontend
npm run dev
```

### 5. Connect MetaMask

1. Add "Anvil Local" network to MetaMask (RPC: http://127.0.0.1:8545, Chain ID: 31337)
2. Import Anvil accounts (use private keys from `anvil` output)
3. Visit http://localhost:5173/ and connect wallet

---

## 📚 Complete Setup Guide

For detailed step-by-step instructions, environment setup, troubleshooting, and verification, see [**SETUP.md**](./SETUP.md).

For deployment checklist and verification, see [**DEPLOYMENT_CHECKLIST.md**](./DEPLOYMENT_CHECKLIST.md).

---

## 🎭 Roles & Permissions

All role enforcement is **on-chain** via smart contract modifiers:

| Role                  | Address           | Permissions                                                    |
| --------------------- | ----------------- | -------------------------------------------------------------- |
| **Certifier**         | Set at deployment | Approve seller registrations                                   |
| **Quality Checker**   | Set at deployment | Approve batch quality                                          |
| **Freight Forwarder** | Set at deployment | Upload shipment documents                                      |
| **Export Customs**    | Set at deployment | Clear exports                                                  |
| **Import Customs**    | Set at deployment | Clear imports & release payment                                |
| **Sellers**           | Any address       | Register (pending approval), create batches, request shipments |
| **Buyers**            | Any address       | Register, create orders, pay escrow                            |

---

## 💡 Key Features

✅ **On-Chain Verification**: Transaction hashes stored on blockchain  
✅ **Off-Chain Storage**: Detailed business data in MongoDB  
✅ **Hash-Based Integrity**: SHA-256 hashing for tamper detection  
✅ **Role-Based Access**: Smart contract enforces permissions  
✅ **USDT Payments**: Escrow-based payment mechanism  
✅ **Full Supply Chain**: Seller → Buyer → QC → FF → Customs → Delivery  
✅ **MetaMask Integration**: User-friendly wallet connection  
✅ **Local Development**: Anvil for zero-cost testing

---

## 🔄 Supply Chain Flow

1. **Seller registers** → Certifier approves
2. **Buyer registers** and creates order
3. **Buyer pays** USDT (escrow in contract)
4. **Seller creates batch** with product info
5. **Quality Checker reviews** and approves batch
6. **Seller requests shipment** (provides freight forwarder)
7. **Freight Forwarder uploads documents** (hash stored on-chain)
8. **Export Customs clears** shipment (status updated on-chain)
9. **Import Customs clears** shipment and releases USDT payment to seller

---

## 🔧 API Endpoints

Base URL: `http://localhost:3000/api`

### Sellers

- `POST /api/sellers/register` - Register as seller
- `GET /api/sellers/:address` - Get seller info
- `POST /api/sellers/:address/approve` - Approve seller (certifier only)

### Buyers

- `POST /api/buyers/register` - Register as buyer
- `GET /api/buyers/:address` - Get buyer info

### Orders

- `POST /api/orders` - Create order
- `GET /api/orders/:orderId` - Get order details
- `POST /api/orders/:orderId/accept` - Accept & pay for order

### Shipments

- `POST /api/shipments` - Request shipment
- `GET /api/shipments/:shipId` - Get shipment status
- `POST /api/shipments/:shipId/documents` - Upload documents

### Records

- `GET /api/records` - Get all on-chain records
- `GET /api/records/:txHash` - Get record by transaction hash

---

## 📊 Data Model (MongoDB)

Records stored with:

- `recordType`: Event type (SELLER_REGISTERED, ORDER_CREATED, etc.)
- `txHash`: Blockchain transaction hash
- `blockNumber`: Block when recorded
- `dataHash`: SHA-256 hash of raw data
- `rawData`: Full business details
- `contractFeedback`: Contract response/status
- `timestamps`: Created/updated dates

---

## 🧪 Testing

### Run Smart Contract Tests

```bash
forge test
```

### Deploy to Sepolia (Testnet)

```bash
# Set SEPOLIA_RPC_URL and deploy
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast
```

---

## 🔐 Security Considerations

- ✅ Role checks in smart contract (cannot be bypassed)
- ✅ Hash-based tamper detection
- ✅ No private keys stored in backend/frontend
- ✅ USDT escrow prevents payment disputes
- ✅ Re-entrancy guards in payment logic
- ⚠️ Production: Use hardware wallets, audit contract, enable rate limiting

---

## 📝 License

MIT License - See LICENSE file

---

## 👥 Contributors

- **TheOnlyNaimur** - Lead Developer

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support

For issues, questions, or suggestions:

- Open a GitHub issue
- Check SETUP.md for common problems
- Refer to contract comments for implementation details

---

**Happy building! 🚀**

### 2. Install Foundry dependencies

```bash
forge install
```

### 3. Install Frontend dependencies

```bash
cd frontend
npm install
```

### 4. Env Setup

create a .env file and store the private key
Copy the the private key where the contract will be deployed.

## Development

### Smart Contracts

#### Compile contracts

```bash
forge build
```

<!-- #### Run tests

```bash
forge test
```

#### Run tests with verbosity

```bash
forge test -vvv
```-->

#### Deploy to local network

```bash
anvil  # Start local node in one terminal
```

```bash
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
```

### Frontend

#### Start development server

```bash
cd frontend
npm run dev
```

## Key Features

### Supply Chain Management

- Product registration and tracking
- Stage-based workflow (Raw Material → Manufacturing → Quality Check → Packaging → Shipping → Delivered)
- Multi-role access control (Admin, Supplier, Manufacturer, QC Inspector, Logistics, Buyer)
- Ownership transfer tracking
- Complete audit trail

### Transparency & Traceability

- Immutable record of all transactions
- Real-time tracking of product status
- Historical data access
- Stakeholder verification

## Use Cases for Bangladesh RMG Sector

1. **Raw Material Tracking** - Track cotton, fabric, and other materials from source
2. **Manufacturing Process** - Monitor production stages and quality control
3. **Export Documentation** - Streamline customs and shipping documentation
4. **Compliance & Certification** - Verify ethical sourcing and labor standards
5. **Buyer Confidence** - Provide end-to-end visibility to international buyers

## Contributing

This is an academic research project. For inquiries or collaboration:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Roadmap

- [x] Phase 1: Research & Problem Identification
- [x] Phase 2: System Design & Architecture
- [ ] Phase 3: Implementation (Current)
  - [x] Project setup and configuration
  - [ ] Smart contract development
  - [ ] Frontend development
  - [ ] Integration and testing
  - [ ] Deployment
- [ ] Phase 4: Testing & Documentation
- [ ] Phase 5: Final Presentation

## Acknowledgments

- Department of Computer Science & Engineering
- Thesis Supervisor
- BRAC University

## Contact

For more information about this project, please contact the development team.

---

**Note:** This is a prototype implementation for academic research purposes. For production deployment, additional security audits and testing are required.
