# BioMesh - Encrypted Health Data Marketplace

A decentralized platform for secure health data sharing using Fully Homomorphic Encryption (FHE). Patients can monetize their health data while maintaining complete privacy, and researchers can run statistical queries on encrypted data without ever seeing raw patient information.

![BioMesh Platform](https://img.shields.io/badge/Platform-Ethereum-blue) ![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black) ![Solidity](https://img.shields.io/badge/Contracts-Solidity%200.8.24-363636) ![FHE](https://img.shields.io/badge/Encryption-Zama%20FHEVM-green)

## 🌟 Features

- **🔒 Privacy-Preserving**: Health data is encrypted using FHE - researchers never see raw data
- **💰 Data Monetization**: Patients earn cryptocurrency when their data is used in research
- **🔬 Research Queries**: Researchers can compute statistics on encrypted data
- **📊 Real-time Analytics**: View earnings, submitted records, and query results
- **🌐 Decentralized**: Built on Ethereum (Sepolia testnet) with smart contracts

## 🏗️ Architecture

```
BioMesh/
├── frontend/          # Next.js 14 web application
│   ├── app/          # App router pages (patient, researcher dashboards)
│   ├── components/   # Reusable React components
│   ├── hooks/        # Custom hooks for contract interaction
│   ├── lib/          # Utilities, encryption, contract ABIs
│   └── contexts/     # React context (wallet state)
│
├── backend/          # Solidity smart contracts
│   ├── contracts/    # DataRegistry, PaymentProcessor, ResearchOracle
│   ├── scripts/      # Deployment scripts
│   ├── test/         # Contract tests
│   └── fhevm/        # Mock TFHE library (for testing)
│
└── SETUP_GUIDE.md    # Detailed setup instructions
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MetaMask wallet with Sepolia testnet ETH
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/UIDickinson/codespaces-blank.git
cd codespaces-blank
```

### 2. Setup Frontend

```bash
cd frontend
npm install
```

Create `.env.local`:
```env
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://rpc.sepolia.org
NEXT_PUBLIC_DATA_REGISTRY_ADDRESS=0xYOUR_CONTRACT_ADDRESS
NEXT_PUBLIC_PAYMENT_PROCESSOR_ADDRESS=0xYOUR_CONTRACT_ADDRESS
NEXT_PUBLIC_RESEARCH_ORACLE_ADDRESS=0xYOUR_CONTRACT_ADDRESS
```

Start development server:
```bash
npm run dev
```

Visit `http://localhost:3000`

### 3. Setup Backend (Optional - for new deployments)

```bash
cd backend
npm install
```

Create `.env`:
```env
PRIVATE_KEY=your_wallet_private_key
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
```

Deploy contracts:
```bash
npx hardhat run scripts/deploy-production.js --network sepolia
```

## 📖 Documentation

- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete setup instructions, troubleshooting, and architecture details
- **[backend/README.md](./backend/README.md)** - Smart contract documentation and deployment guide
- **[blueprint.md](./blueprint.md)** - Original project blueprint and specifications

## 🔧 Configuration Modes

### Mock Mode (Default - for Testing)

The project ships with mock TFHE contracts that simulate encryption. This allows you to:
- Test the full user flow
- Submit health records
- View records and earnings
- No real encryption (data visible on-chain)

### Production Mode (Real FHE)

For production with real encryption:
1. Install `@fhevm/solidity` in backend
2. Redeploy contracts to Sepolia
3. Set `USE_REAL_FHE = true` in `frontend/lib/encryption.js`
4. Update contract addresses in `.env.local`

See [SETUP_GUIDE.md](./SETUP_GUIDE.md#production-deployment-checklist) for details.

## 🖥️ User Roles

### Patient Dashboard (`/patient`)
- Submit encrypted health data
- View submitted records
- Track earnings from data usage
- Revoke data access

### Researcher Dashboard (`/researcher`)
- Execute encrypted queries
- View query results
- Track research spending

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Wallet | ethers.js v6, MetaMask |
| Encryption | @zama-fhe/relayer-sdk |
| Contracts | Solidity 0.8.24, Hardhat |
| Network | Ethereum Sepolia Testnet |

## 📝 Smart Contracts

| Contract | Purpose |
|----------|---------|
| `DataRegistry.sol` | Stores encrypted patient health records |
| `PaymentProcessor.sol` | Distributes query fees to data contributors |
| `ResearchOracle.sol` | Executes statistical queries on encrypted data |

## 🔐 Security Notes

⚠️ **This is a demonstration project**. Before production use:
- Conduct a security audit
- Implement proper key management
- Deploy with real FHEVM contracts
- Ensure HIPAA/GDPR compliance
- Never commit private keys

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
