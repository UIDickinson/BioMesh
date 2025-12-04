# BioMesh Complete Setup Guide

## 📋 Table of Contents
1. [Current Status](#current-status)
2. [Quick Start](#quick-start)
3. [Architecture Overview](#architecture-overview)
4. [Backend Setup (Smart Contracts)](#backend-setup-smart-contracts)
5. [Frontend Setup](#frontend-setup)
6. [Environment Configuration](#environment-configuration)
7. [Deployment Scripts](#deployment-scripts)
8. [Issues Fixed & Solutions](#issues-fixed--solutions)
9. [Production Deployment Checklist](#production-deployment-checklist)
10. [Troubleshooting](#troubleshooting)
11. [Useful Commands](#useful-commands)

---

## Current Status

### ✅ What's Working
| Component | Status | Details |
|-----------|--------|---------|
| Next.js Frontend | ✅ Working | All routes compile, hot reload works |
| Smart Contracts | ✅ Working | 3 production contracts + 2 mocks, 78 tests passing |
| Wallet Connection | ✅ Working | MetaMask connects, state shared across app |
| FHE Encryption | ✅ Working | `@zama-fhe/relayer-sdk@0.3.0-6` with real encryption |
| Patient Dashboard | ✅ Working | Records count, earnings display correctly |
| Researcher Dashboard | ✅ Working | Query stats, spending, results all display |
| Payment Distribution | ✅ Working | Multi-user support, dust handling |
| Production FHE | ✅ Working | `@fhevm/solidity` v0.9.1 deployed on Sepolia |

### 📍 Current Deployment (Sepolia)

| Contract | Address |
|----------|---------|
| DataRegistry | `0xd51ca70ce024f2fdB1bC02692549C819da5407A2` |
| PaymentProcessor | `0x17560A4F6D5783D6057A042A72B7BE4093DD8714` |
| ResearchOracle | `0x7eBaC8C8C5fecc762892Ac23B031986CCA158d82` |

---

## Quick Start

### Frontend Only (Using Deployed Contracts)
```bash
cd frontend
npm install
# Copy .env.example to .env.local and update addresses
npm run dev
# Visit http://localhost:3000
```

### Full Stack (New Deployment)
```bash
# 1. Deploy contracts
cd backend
npm install
# Set PRIVATE_KEY in .env
npx hardhat run scripts/deploy-testnet.js --network sepolia

# 2. Update frontend with new contract addresses
# Copy addresses from deployment output to frontend/.env.local

# 3. Start frontend
cd ../frontend
npm run dev
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BioMesh Application                           │
├─────────────────────────────────────────────────────────────────────┤
│  Frontend (Next.js 14)                                               │
│  ├── React Components (Patient Forms, Researcher Queries)           │
│  ├── WalletContext (Shared MetaMask state)                          │
│  ├── Custom Hooks (useDataRegistry, usePaymentProcessor, etc.)      │
│  └── FHE Module (encryption.js with mock/real mode switch)          │
├─────────────────────────────────────────────────────────────────────┤
│  Backend (Solidity Contracts on Sepolia)                            │
│  ├── DataRegistry.sol (Patient health data - FHE encrypted)         │
│  ├── PaymentProcessor.sol (Research payment distribution)           │
│  ├── ResearchOracle.sol (Encrypted query execution)                 │
│  └── mocks/*.sol (Testing versions without FHE coprocessor)         │
├─────────────────────────────────────────────────────────────────────┤
│                         Dependencies                                 │
│  Frontend:                          Backend:                         │
│  ├── @zama-fhe/relayer-sdk@0.3.0-6  ├── @fhevm/solidity@0.9.1       │
│  ├── ethers@6.x                     ├── encrypted-types              │
│  └── next@14.x                      └── hardhat                      │
├─────────────────────────────────────────────────────────────────────┤
│                      External Services                               │
│  ├── MetaMask (window.ethereum)                                      │
│  ├── Sepolia Testnet RPC                                             │
│  └── Zama FHE Coprocessor (for real FHE mode)                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Backend Setup (Smart Contracts)

### Production Contract Architecture

The production contracts use **@fhevm/solidity v0.9.1**:

```solidity
// DataRegistry.sol
import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";
import "encrypted-types/EncryptedTypes.sol";

contract DataRegistry is ZamaEthereumConfig {
    // Uses externalEuint32, externalEuint64 for inputs
    // Uses FHE.fromExternal() to verify and convert
    // Uses FHE.allow(), FHE.allowThis() for access control
}
```

### Contract Files

| File | Purpose |
|------|---------|
| `contracts/DataRegistry.sol` | Stores encrypted patient health records |
| `contracts/PaymentProcessor.sol` | Distributes query fees (70/30 split) |
| `contracts/ResearchOracle.sol` | Executes encrypted statistical queries |
| `contracts/mocks/MockDataRegistry.sol` | Testing without FHE coprocessor |
| `contracts/mocks/MockResearchOracle.sol` | Testing without FHE coprocessor |

### Environment Configuration

Create `backend/.env`:
```env
# Required for deployment
PRIVATE_KEY=your_wallet_private_key_here

# RPC URL (optional - uses hardhat config default)
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# Optional: For contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Compile & Test

```bash
cd backend
npm install
npx hardhat compile          # Compile all contracts
npx hardhat test             # Run 78 tests
npx hardhat test --grep "DataRegistry"  # Run specific tests
```

---

## Frontend Setup

### Package Dependencies

Key packages in `frontend/package.json`:
```json
{
  "dependencies": {
    "@zama-fhe/relayer-sdk": "^0.3.0-6",
    "ethers": "^6.9.0",
    "next": "^14.2.33",
    "react": "^18.2.0"
  }
}
```

### Critical Configuration Files

#### `frontend/next.config.js`
Handles WASM bundling for FHE SDK:
```javascript
webpack: (config) => {
  // Treat WASM as static assets
  config.module.rules.push({
    test: /\.wasm$/,
    type: 'asset/resource',
  });
  // Polyfill global
  config.plugins.push(
    new (require('webpack').DefinePlugin)({
      global: 'globalThis',
    })
  );
  return config;
}
```

#### `frontend/lib/encryption.js`
Controls FHE mode (mock vs real):
```javascript
const USE_REAL_FHE = process.env.NEXT_PUBLIC_USE_REAL_FHE === 'true';
```

#### `frontend/lib/contracts.js`
Contains ABIs and switches between mock (uint256) and production (bytes32) types:
```javascript
const USE_PRODUCTION_ABI = process.env.NEXT_PUBLIC_USE_PRODUCTION_ABI === 'true';
```

---

## Environment Configuration

### Frontend: `frontend/.env.local`
```env
# Chain Configuration
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# Contract Addresses (update after deployment)
NEXT_PUBLIC_DATA_REGISTRY_ADDRESS=0xd51ca70ce024f2fdB1bC02692549C819da5407A2
NEXT_PUBLIC_PAYMENT_PROCESSOR_ADDRESS=0x17560A4F6D5783D6057A042A72B7BE4093DD8714
NEXT_PUBLIC_RESEARCH_ORACLE_ADDRESS=0x7eBaC8C8C5fecc762892Ac23B031986CCA158d82

# FHE Mode (both must match)
NEXT_PUBLIC_USE_REAL_FHE=true
NEXT_PUBLIC_USE_PRODUCTION_ABI=true
```

### Backend: `backend/.env`
```env
PRIVATE_KEY=your_wallet_private_key
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
ETHERSCAN_API_KEY=your_etherscan_api_key
```

---

## Deployment Scripts

All scripts are in `backend/scripts/`:

### Full Deployment
```bash
npx hardhat run scripts/deploy-testnet.js --network sepolia
```
Deploys all three contracts and sets up authorizations.

### Individual Contract Redeployment

Use these when you need to update a single contract without redeploying everything:

#### Redeploy DataRegistry
```bash
npx hardhat run scripts/redeploy-data-registry.js --network sepolia
```
⚠️ **Warning**: Creates a new contract. Existing records are NOT migrated.

#### Redeploy PaymentProcessor
```bash
npx hardhat run scripts/redeploy-payment-processor.js --network sepolia
```
⚠️ **Warning**: Unclaimed earnings are NOT migrated. Patients should withdraw first.

#### Redeploy ResearchOracle
```bash
npx hardhat run scripts/redeploy-oracle.js --network sepolia
```
Deploys new oracle and authorizes it in DataRegistry and PaymentProcessor.

### Utility Scripts

#### Authorize Oracle
```bash
npx hardhat run scripts/authorize-oracle.js --network sepolia
```
Authorizes ResearchOracle in both DataRegistry and PaymentProcessor.

#### Verify Contracts
```bash
npx hardhat run scripts/verify.js --network sepolia
```
Verifies contracts on Etherscan.

---

## Issues Fixed & Solutions

### Issue 1: React Hooks Violation
**Error:** `Invalid hook call`
**Solution:** Call hooks at component top level, not inside callbacks.

### Issue 2: WASM Parse Errors
**Error:** `Module parse failed: Internal failure`
**Solution:** Configure webpack to treat WASM as static assets in `next.config.js`.

### Issue 3: "global is not defined"
**Solution:** Add DefinePlugin: `global: 'globalThis'` in webpack config.

### Issue 4: FHE SDK Not Initialized
**Error:** `Cannot read properties of undefined (reading '__wbindgen_malloc')`
**Solution:** Call `initSDK()` before `createInstance()`.

### Issue 5: Production FHE API Changes
**Issue:** `@fhevm/solidity` v0.9.1 has different API than older versions
**Changes:**
- `TFHE` library → `FHE` library
- `einput` type → `externalEuint32`, `externalEuint64`
- `TFHE.asEuint32(input, proof)` → `FHE.fromExternal(input, proof)`
- `SepoliaZamaFHEVMConfig` → `ZamaEthereumConfig`

### Issue 6: CoprocessorCallUnauthorized Error
**Error:** `execution reverted (unknown custom error) 0x9de3392c...`
**Cause:** ResearchOracle trying to read encrypted data without FHE permission.
**Solution:** 
1. ResearchOracle must be authorized in DataRegistry
2. ResearchOracle calls `grantOracleAccess()` before reading each record
3. Redeployed ResearchOracle with fix

### Issue 7: Invalid BytesLike Value
**Error:** `invalid BytesLike value (argument="value", value=23485451...)`
**Cause:** Frontend sending BigInt instead of bytes32 for production mode.
**Solution:** Check `isRealFHEMode()` and pass handles as hex strings for production.

### Issue 8: Records Display Wrong Data
**Cause:** ABI missing fields for `records` mapping.
**Solution:** Include all 7 fields in ABI output declaration.

### Issue 9: Payment Dust
**Issue:** Integer division leaves tiny amounts stuck in contract.
**Solution:** Added dust handling - remainder goes to first patient in batch.

---

## Production Deployment Checklist

### Backend
- [x] Install `@fhevm/solidity@0.9.1` package
- [x] Update contracts to use `FHE` library
- [x] Update contracts to use `ZamaEthereumConfig`
- [x] Update inputs to `externalEuint32`/`externalEuint64`
- [x] Create mock contracts for testing
- [x] All 78 tests passing
- [x] Deploy to Sepolia
- [x] Authorize oracle contracts

### Frontend
- [x] Update `.env.local` with contract addresses
- [x] Set `NEXT_PUBLIC_USE_PRODUCTION_ABI=true`
- [x] Set `NEXT_PUBLIC_USE_REAL_FHE=true`
- [x] Test wallet connection
- [x] Test form submission with real encryption
- [x] Test records viewing
- [x] Test researcher queries

---

## Troubleshooting

### Wallet Won't Connect
1. Ensure MetaMask is installed
2. Switch to Sepolia network (Chain ID: 11155111)
3. Check browser console for errors

### Transaction Fails
1. Check you have Sepolia ETH (get from faucet)
2. Check contract addresses in `.env.local`
3. Check console for specific error message

### FHE Encryption Fails
1. Ensure `NEXT_PUBLIC_USE_REAL_FHE=true`
2. Check browser console for SDK initialization errors
3. Try refreshing the page

### Query Returns Error
1. Ensure ResearchOracle is authorized in DataRegistry
2. Check that records exist in DataRegistry
3. Verify query fee is being sent with transaction

---

## Useful Commands

### Frontend
```bash
cd frontend
npm install                      # Install dependencies
npm run dev                      # Start dev server (port 3000)
npm run build                    # Production build
npm run lint                     # Check for errors
```

### Backend
```bash
cd backend
npm install                      # Install dependencies
npx hardhat compile              # Compile contracts
npx hardhat compile --force      # Force recompile
npx hardhat test                 # Run all tests
npx hardhat test --grep "Pattern"  # Run specific tests
npx hardhat console --network sepolia  # Interactive console
```

### Contract Interaction (Console)
```javascript
// In hardhat console
const dr = await ethers.getContractAt("DataRegistry", "0x...")
await dr.recordCount()
await dr.authorizedOracles("0x...")
```

### Check Contract Deployment
```bash
curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_getCode","params":["CONTRACT_ADDRESS","latest"],"id":1}' \
  https://ethereum-sepolia-rpc.publicnode.com
```

---

## Reference Links

- [Zama FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Sepolia Etherscan](https://sepolia.etherscan.io/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Next.js Documentation](https://nextjs.org/docs)

---

*Last Updated: December 4, 2025*
