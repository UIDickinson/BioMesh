# BioMesh - Encrypted Health Data Marketplace

A decentralized platform for secure health data sharing using Fully Homomorphic Encryption (FHE). Patients can monetize their health data while maintaining complete privacy, and researchers can run statistical queries on encrypted data without ever seeing raw patient information.

![BioMesh Platform](https://img.shields.io/badge/Platform-Ethereum-blue) ![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black) ![Solidity](https://img.shields.io/badge/Contracts-Solidity%200.8.24-363636) ![FHE](https://img.shields.io/badge/Encryption-Zama%20FHEVM-green)

## 🌟 Features

- **🔒 Privacy-Preserving**: Health data is encrypted using FHE - researchers never see raw data
- **💰 Data Monetization**: Patients earn cryptocurrency when their data is used in research
- **🔬 Research Queries**: Researchers can compute statistics on encrypted data
- **📊 Real-time Analytics**: View earnings, submitted records, and query results
- **🌐 Decentralized**: Built on Ethereum (Sepolia testnet) with smart contracts

## 🏗️ Project Structure

```
BioMesh/
├── frontend/                 # Next.js 14 web application
│   ├── app/                  # App router pages (patient, researcher dashboards)
│   ├── components/           # Reusable React components
│   ├── hooks/                # Custom hooks for contract interaction
│   ├── lib/                  # Utilities, encryption, contract ABIs
│   └── contexts/             # React context (wallet state)
│
├── backend/                  # Solidity smart contracts
│   ├── contracts/            # Production contracts (DataRegistry, PaymentProcessor, ResearchOracle)
│   │   ├── mocks/            # Mock contracts for local testing
│   │   └── interfaces/       # Contract interfaces
│   ├── scripts/              # Deployment & utility scripts
│   ├── test/                 # Contract tests (78 passing)
│   └── deployments/          # Deployment addresses & artifacts
│
├── README.md                 # This file - project overview
└── SETUP_GUIDE.md            # Detailed setup, troubleshooting, and technical docs
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MetaMask wallet with Sepolia testnet ETH
- Git

### 1. Clone & Install

```bash
git clone https://github.com/UIDickinson/codespaces-blank.git
cd codespaces-blank

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies (for contract development)
cd ../backend
npm install
```

### 2. Configure Environment

Create `frontend/.env.local`:
```env
# Network
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# Contract Addresses (Sepolia Deployment)
NEXT_PUBLIC_DATA_REGISTRY_ADDRESS=0xd51ca70ce024f2fdB1bC02692549C819da5407A2
NEXT_PUBLIC_PAYMENT_PROCESSOR_ADDRESS=0x17560A4F6D5783D6057A042A72B7BE4093DD8714
NEXT_PUBLIC_RESEARCH_ORACLE_ADDRESS=0x7eBaC8C8C5fecc762892Ac23B031986CCA158d82

# FHE Mode (set both to 'true' for production)
NEXT_PUBLIC_USE_REAL_FHE=true
NEXT_PUBLIC_USE_PRODUCTION_ABI=true
```

### 3. Run Development Server

```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000`

## 🖥️ User Roles

### Patient Dashboard (`/patient`)
- **Submit Data**: Encrypt and submit health records (age, diagnosis, treatment outcome, biomarkers)
- **View Records**: See all submitted records with timestamps
- **Track Earnings**: Monitor earnings from researchers using your data
- **Revoke Access**: Remove data from the marketplace

### Researcher Dashboard (`/researcher`)
- **Execute Queries**: Run statistical queries on encrypted data
- **View Results**: See aggregated results (averages, counts) without raw data
- **Track Spending**: Monitor query costs and history

## 🔧 Configuration Modes

| Mode | Use Case | FHE Encryption | Setup |
|------|----------|----------------|-------|
| **Mock** | Local testing | Simulated | Default |
| **Production** | Sepolia testnet | Real Zama FHE | See [SETUP_GUIDE.md](./SETUP_GUIDE.md) |

### Switch to Production Mode

1. Set in `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_USE_REAL_FHE=true
   NEXT_PUBLIC_USE_PRODUCTION_ABI=true
   ```
2. Ensure contract addresses point to production-deployed contracts
3. Restart frontend: `npm run dev`

## 📝 Smart Contracts

| Contract | Address (Sepolia) | Purpose |
|----------|-------------------|---------|
| `DataRegistry` | `0xd51ca70ce024f2fdB1bC02692549C819da5407A2` | Stores encrypted patient health records |
| `PaymentProcessor` | `0x17560A4F6D5783D6057A042A72B7BE4093DD8714` | Distributes query fees (70% patient, 30% platform) |
| `ResearchOracle` | `0x7eBaC8C8C5fecc762892Ac23B031986CCA158d82` | Executes encrypted statistical queries |

### Deployment Scripts

```bash
cd backend

# Deploy all contracts
npx hardhat run scripts/deploy-testnet.js --network sepolia

# Redeploy individual contracts (if code changes)
npx hardhat run scripts/redeploy-data-registry.js --network sepolia
npx hardhat run scripts/redeploy-payment-processor.js --network sepolia
npx hardhat run scripts/redeploy-oracle.js --network sepolia

# Authorize oracle in DataRegistry/PaymentProcessor
npx hardhat run scripts/authorize-oracle.js --network sepolia
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, Tailwind CSS, Framer Motion |
| Wallet | ethers.js v6, MetaMask |
| Encryption | @zama-fhe/relayer-sdk v0.3.0-6 |
| Contracts | Solidity 0.8.24, @fhevm/solidity v0.9.1 |
| Testing | Hardhat, Chai (78 tests passing) |
| Network | Ethereum Sepolia Testnet |

## 🧪 Testing

### Backend Tests
```bash
cd backend
npx hardhat test
# 78 passing tests covering all contract functionality
```

### Frontend (Manual)
1. Connect MetaMask to Sepolia
2. Get test ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
3. Submit health data as patient
4. Execute query as researcher
5. Check patient earnings

## 📖 Documentation

For detailed technical documentation, troubleshooting, and architecture details, see:

**[📚 SETUP_GUIDE.md](./SETUP_GUIDE.md)**

Contents:
- Complete environment setup
- FHE encryption details
- Contract architecture
- All issues fixed & solutions
- Production deployment checklist
- Useful commands reference

## 🔐 Security Notes

⚠️ **This is a demonstration project**. Before production use:
- Conduct a professional security audit
- Implement proper key management
- Ensure HIPAA/GDPR compliance
- Never commit private keys or mnemonics
- Use hardware wallets for production deployments

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

- [Zama](https://www.zama.ai/) - FHE technology and FHEVM
- [Hardhat](https://hardhat.org/) - Ethereum development environment
- [Next.js](https://nextjs.org/) - React framework

---

**Built for the Zama Blockchain Developer Program** 🚀

*Last Updated: December 4, 2025*
