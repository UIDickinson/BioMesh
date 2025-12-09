# BioMesh - Encrypted Health Data Marketplace

A decentralized platform for secure health data sharing using Fully Homomorphic Encryption (FHE). Patients can monetize their health data while maintaining complete privacy, and researchers can run statistical queries on encrypted data without ever seeing raw patient information.

![BioMesh Platform](https://img.shields.io/badge/Platform-Ethereum-blue) ![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black) ![Solidity](https://img.shields.io/badge/Contracts-Solidity%200.8.24-363636) ![FHE](https://img.shields.io/badge/Encryption-Zama%20FHEVM-green)

## Features

- **Privacy-Preserving**: Health data is encrypted using FHE - researchers never see raw data
- **Data Monetization**: Patients earn cryptocurrency when their data is used in research
- **Research Queries**: Researchers can compute statistics on encrypted data
- **Real-time Analytics**: View earnings, submitted records, and query results
- **Decentralized**: Built on Ethereum (Sepolia testnet) with smart contracts
- **Consent Management**: Comprehensive consent registry for patients and researchers with revocation support
- **Identity Verification**: Optional World ID integration for Sybil-resistant identity verification
- **Data Verification**: Multi-layered verification system including AI document verification, stake/slashing, and provider attestation
- **Reputation System**: Trust scores based on data submission history and verification status


## Quick Start

### Prerequisites

- Node.js 18+
- Web3 wallet (Rabby,Metamask etc) with Sepolia testnet ETH

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

# Contract Addresses (Sepolia Deployment - Latest)
NEXT_PUBLIC_DATA_REGISTRY_ADDRESS=0x09CEf6B36433614e0Db6875940EDEF51dED8d284
NEXT_PUBLIC_PAYMENT_PROCESSOR_ADDRESS=0x5Ca58CFdaFEa511E308aF0E76777C4f63C0c9C76
NEXT_PUBLIC_RESEARCH_ORACLE_ADDRESS=0x59B9975Fc50C9F4DAfA40Ad25158Cbb557a15226
NEXT_PUBLIC_CONSENT_REGISTRY_ADDRESS=0xC4d42Ae8F522BEe5739E419e61752a15AbbFc52a
NEXT_PUBLIC_VERIFICATION_REGISTRY_ADDRESS=0x21e97601033937a1ee9b3EB08d887D75d2436bF3

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

## User Roles

### Patient Dashboard (`/patient`)
- **Consent Form**: Sign consent acknowledging data usage, anonymization, payment terms, and revocation rights
- **Submit Data**: Encrypt and submit health records (age, diagnosis, treatment outcome, biomarkers)
- **Data Verification**: Optional stake-based verification and document upload for enhanced trust
- **View Records**: See all submitted records with timestamps and verification status
- **Track Earnings**: Monitor earnings from researchers using your data
- **Revoke Access**: Remove data from the marketplace and revoke consent

### Researcher Dashboard (`/researcher`)
- **Consent Form**: Agree to data privacy, ethical use, and security obligations
- **Execute Queries**: Run statistical queries on encrypted data
- **View Results**: See aggregated results (averages, counts) without raw data
- **Track Spending**: Monitor query costs and history

### About Page (`/about`)
- Platform overview and technology explanation
- Feature descriptions and architecture details

## Configuration Modes

| Mode | Use Case | FHE Encryption | Setup |
|------|----------|----------------|-------|
| **Mock** | Local testing | Simulated | set false on env files |
| **Production** | Sepolia testnet | Real Zama FHE | Set true (default) |

### Switch to Production Mode

1. Set in `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_USE_REAL_FHE=true
   NEXT_PUBLIC_USE_PRODUCTION_ABI=true
   ```
2. Ensure contract addresses point to production-deployed contracts
3. Restart frontend: `npm run dev`

## Smart Contracts

| Contract | Address (Sepolia) | Purpose |
|----------|-------------------|---------|
| `DataRegistry` | `0x09CEf6B36433614e0Db6875940EDEF51dED8d284` | Stores encrypted patient health records |
| `PaymentProcessor` | `0x5Ca58CFdaFEa511E308aF0E76777C4f63C0c9C76` | Distributes query fees (70% patient, 30% platform) |
| `ResearchOracle` | `0x59B9975Fc50C9F4DAfA40Ad25158Cbb557a15226` | Executes encrypted statistical queries |
| `ConsentRegistry` | `0xC4d42Ae8F522BEe5739E419e61752a15AbbFc52a` | Manages consent forms and World ID verification |
| `VerificationRegistry` | `0x21e97601033937a1ee9b3EB08d887D75d2436bF3` | Handles data authenticity verification and reputation |

### Deployment Scripts

```bash
cd backend

# Deploy all contracts (recommended)
npx hardhat run scripts/deploy-all.js --network sepolia

# Deploy individual contracts
npx hardhat run scripts/deploy-testnet.js --network sepolia
npx hardhat run scripts/deploy-consent-registry.js --network sepolia
npx hardhat run scripts/deploy-verification.js --network sepolia

# Redeploy individual contracts (if code changes)
npx hardhat run scripts/redeploy-data-registry.js --network sepolia
npx hardhat run scripts/redeploy-payment-processor.js --network sepolia
npx hardhat run scripts/redeploy-oracle.js --network sepolia

# Authorize oracle in DataRegistry/PaymentProcessor
npx hardhat run scripts/authorize-oracle.js --network sepolia
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, Tailwind CSS, Framer Motion, Lucide React |
| Wallet | ethers.js v6, Web3 wallet |
| Encryption | Zama fhEVM, @zama-fhe/relayer-sdk v0.3.0-6 |
| Contracts | Solidity 0.8.24, @fhevm/solidity v0.9.1 |
| Testing | Hardhat, Chai (127 passing tests) |
| Network | Ethereum Sepolia Testnet |

## Architecture

```
Frontend (Next.js)
    |
    +-- Contexts
    |   +-- WalletContext (Web3 connection)
    |   +-- ConsentContext (User consent state)
    |
    +-- Hooks
    |   +-- useDataRegistry (FHE data operations)
    |   +-- usePaymentProcessor (Earnings/payments)
    |   +-- useResearchOracle (Query execution)
    |   +-- useConsent (Consent management)
    |   +-- useVerification (Data verification)
    |   +-- useWorldId (Identity verification)
    |   +-- useFHE (Encryption utilities)
    |
    +-- Smart Contracts (Sepolia)
        +-- DataRegistry (Encrypted storage)
        +-- PaymentProcessor (Fee distribution)
        +-- ResearchOracle (FHE queries)
        +-- ConsentRegistry (Consent + World ID)
        +-- VerificationRegistry (Trust system)
```

## Testing

### Backend Tests
```bash
cd backend
npx hardhat test
# 127 passing tests covering all contract functionality
```

### Frontend (Manual)
1. Connect wallet to Sepolia
2. Get test ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
3. Complete consent form as patient or researcher
4. (Optional) Complete World ID verification for enhanced trust
5. Submit health data as patient
6. Execute query as researcher
7. Check patient earnings

## New Contract Features

### ConsentRegistry
- Patient consent with acknowledgments for data usage, anonymization, payment terms, and risks
- Researcher consent with ethical use agreements and institutional information
- World ID verification integration (optional, Sybil-resistant)
- Consent revocation and status tracking
- Payment preference configuration (aggregate vs individual queries)

### VerificationRegistry
- AI document verification with confidence scoring
- Stake-based verification (0.001 - 0.1 ETH stake)
- Healthcare provider attestation support
- Reputation system (0-1000 score)
- Dispute resolution with 7-day window
- Slash mechanism for fraudulent data (100% stake loss)

## Documentation

For detailed technical documentation, troubleshooting, and architecture details, contact:

**[UIDickinson](https://x.com/ui_anon)**

Contents:
- Complete environment setup
- FHE encryption details
- Contract architecture
- All issues fixed & solutions
- Production deployment checklist
- Useful commands reference

## Security Notes

**This is a demonstration project**. Before production use:
- Conduct a professional security audit
- Implement proper key management
- Ensure HIPAA/GDPR compliance
- Never commit private keys or mnemonics
- Use hardware wallets for production deployments
- Enable real World ID verification (currently in demo mode)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## Acknowledgments

- [Zama](https://www.zama.ai/) - FHE technology and FHEVM
- [Hardhat](https://hardhat.org/) - Ethereum development environment
- [Next.js](https://nextjs.org/) - React framework

---

**Built for the Zama Blockchain Developer Program**
