# Blockchain Based Unified Platform for RMG Sector in Bangladesh

## Project Overview

This project implements a blockchain-based supply chain tracking system for the Ready-Made Garment (RMG) sector in Bangladesh. The system ensures transparency, traceability, and accountability throughout the entire supply chain from raw material procurement to final product delivery.

### Phase 3: Implementation

This repository contains the Phase 3 (Implementation) of our thesis project, building upon the research and design completed in Phase 2.

## Technology Stack

### Smart Contracts

- **Foundry** - Fast, portable and modular toolkit for Ethereum application development
- **Solidity ^0.8.20** - Smart contract programming language

### Frontend

- **React 18** - UI framework
- **TypeScript** - Type-safe development
- **Viem** - TypeScript interface for Ethereum
- **Wagmi** - React Hooks for Ethereum
- **TanStack Query** - Async state management
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Build tool and dev server

## Project Structure

```
.
├── foundry.toml           # Foundry configuration
├── .env(create this )     # Environment variables template
├── src/                   # Smart contracts source
├── test/                  # Smart contract tests
├── script/                # Deployment scripts
├── frontend/              # React frontend application
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- [Git](https://git-scm.com/)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/TheOnlyNaimur/Blockchain-in-RMG-sector-of-Bangladesh.git
cd Blockchain-in-RMG-sector-of-Bangladesh
```

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
