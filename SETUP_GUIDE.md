# BioMesh Complete Setup Guide

## 📋 Table of Contents
1. [Current Status](#current-status)
2. [Quick Start](#quick-start)
3. [Architecture Overview](#architecture-overview)
4. [Backend Setup (Smart Contracts)](#backend-setup-smart-contracts)
5. [Frontend Setup](#frontend-setup)
6. [Environment Configuration](#environment-configuration)
7. [Issues Fixed & Solutions](#issues-fixed--solutions)
8. [Production Deployment Checklist](#production-deployment-checklist)
9. [Troubleshooting](#troubleshooting)

---

## Current Status

### ✅ What's Working
| Component | Status | Details |
|-----------|--------|---------|
| Next.js Frontend | ✅ Working | All 13 routes compile, hot reload works |
| Smart Contracts | ✅ Working | 8 contracts compiled, 78 tests passing |
| React Hooks | ✅ Fixed | No more "Invalid hook call" errors |
| Tailwind CSS | ✅ Working | Theme variables configured |
| Wallet Connection | ✅ Working | MetaMask connects, state shared across app |
| WASM Bundling | ✅ Fixed | Excluded from webpack, loads at runtime |
| FHE SDK Import | ✅ Working | `@zama-fhe/relayer-sdk@0.3.0-6` with `initSDK()` + `SepoliaConfig` |
| FHE Encryption | ✅ Working | SDK initializes, encrypts data successfully |
| Patient Dashboard | ✅ Working | Records count, earnings display correctly |
| Researcher Dashboard | ✅ Working | Query stats, spending, results all display |
| Payment Distribution | ✅ Working | Multi-user support, dust handling, reentrancy protection |
| Form Submission | ⚠️ Mock Mode | Works with mock contracts (see note below) |

### ⚠️ Important: Mock vs Production Mode

The **backend contracts were deployed with a MOCK TFHE library** (stubs for local testing). This means:

- **Mock Mode (Current):** Frontend uses simulated encryption, data is NOT actually encrypted on-chain
- **Production Mode:** Requires redeploying contracts with real `@fhevm/solidity` package

To switch modes, update TWO files:

1. `frontend/lib/encryption.js`:
```javascript
const USE_REAL_FHE = false;  // Set to true after deploying real FHEVM contracts
```

2. `frontend/.env.local`:
```env
NEXT_PUBLIC_USE_PRODUCTION_ABI=false  # Set to true for production
```

---

## Quick Start

### Frontend Only (Mock Mode)
```bash
cd frontend
npm install
npm run dev
# Visit http://localhost:3000
```

### Full Stack (Production Mode)
```bash
# 1. Deploy real FHEVM contracts
cd backend
npm install
# Set MNEMONIC and INFURA_API_KEY in .env
npx hardhat run scripts/deploy-testnet.js --network sepolia

# 2. Update frontend with new contract addresses
# Copy addresses from deployment output to frontend/.env.local

# 3. Enable real FHE in frontend
# Edit frontend/lib/encryption.js: USE_REAL_FHE = true

# 4. Start frontend
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
│  ├── DataRegistry.sol (Patient health data storage)                 │
│  ├── PaymentProcessor.sol (Research payment distribution)           │
│  └── ResearchOracle.sol (Encrypted query execution)                 │
├─────────────────────────────────────────────────────────────────────┤
│                         Dependencies                                 │
│  Frontend:                          Backend:                        │
│  ├── @zama-fhe/relayer-sdk@0.3.0-5  ├── @fhevm/solidity (production)│
│  ├── ethers@6.x                     ├── OR mock TFHE.sol (testing)  │
│  └── next@14.x                      └── hardhat                     │
├─────────────────────────────────────────────────────────────────────┤
│                      External Services                               │
│  ├── MetaMask (window.ethereum)                                     │
│  ├── Sepolia Testnet RPC                                            │
│  └── Zama Relayer (for real FHE mode)                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Backend Setup (Smart Contracts)

### Current State: Mock Contracts

The contracts in `backend/` use **mock/stub** TFHE libraries:
- `fhevm/lib/TFHE.sol` - Mock library that does simple type casts
- `fhevm/config/ZamaFHEVMConfig.sol` - Empty stub

These work for testing the flow but don't provide real encryption.

### For Production: Deploy with Real FHEVM

#### Step 1: Install Real FHEVM Package

```bash
cd backend
npm install @fhevm/solidity
```

#### Step 2: Update Contract Imports

Edit `backend/contracts/DataRegistry.sol`:
```solidity
// BEFORE (mock):
import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

// AFTER (production):
import "@fhevm/solidity/lib/TFHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";
```

Also update the contract inheritance:
```solidity
// BEFORE:
contract DataRegistry is SepoliaZamaFHEVMConfig, GatewayCaller {

// AFTER:
contract DataRegistry is ZamaEthereumConfig {
```

#### Step 3: Configure Hardhat

File: `backend/hardhat.config.js`
```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 800 },
      evmVersion: "cancun",
    },
  },
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: { mnemonic: process.env.MNEMONIC },
      chainId: 11155111,
    },
  },
};
```

#### Step 4: Create Deployment Script

File: `backend/scripts/deploy-production.js`
```javascript
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);
  console.log("Balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy DataRegistry
  const DataRegistry = await hre.ethers.getContractFactory("DataRegistry");
  const dataRegistry = await DataRegistry.deploy();
  await dataRegistry.waitForDeployment();
  const dataRegistryAddress = await dataRegistry.getAddress();
  console.log("DataRegistry deployed to:", dataRegistryAddress);

  // Deploy PaymentProcessor
  const PaymentProcessor = await hre.ethers.getContractFactory("PaymentProcessor");
  const paymentProcessor = await PaymentProcessor.deploy(dataRegistryAddress);
  await paymentProcessor.waitForDeployment();
  const paymentProcessorAddress = await paymentProcessor.getAddress();
  console.log("PaymentProcessor deployed to:", paymentProcessorAddress);

  // Deploy ResearchOracle
  const ResearchOracle = await hre.ethers.getContractFactory("ResearchOracle");
  const researchOracle = await ResearchOracle.deploy(dataRegistryAddress, paymentProcessorAddress);
  await researchOracle.waitForDeployment();
  const researchOracleAddress = await researchOracle.getAddress();
  console.log("ResearchOracle deployed to:", researchOracleAddress);

  // Authorize oracle in DataRegistry
  await dataRegistry.authorizeOracle(researchOracleAddress);
  console.log("ResearchOracle authorized in DataRegistry");

  // Save deployment info
  const deployment = {
    network: "sepolia",
    chainId: 11155111,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      DataRegistry: dataRegistryAddress,
      PaymentProcessor: paymentProcessorAddress,
      ResearchOracle: researchOracleAddress,
    },
  };

  // Save to file
  fs.writeFileSync(
    "deployments/sepolia-production.json",
    JSON.stringify(deployment, null, 2)
  );

  // Print env file format
  console.log("\n========================================");
  console.log("📋 Copy these to frontend/.env.local:");
  console.log("========================================");
  console.log(`NEXT_PUBLIC_DATA_REGISTRY_ADDRESS=${dataRegistryAddress}`);
  console.log(`NEXT_PUBLIC_PAYMENT_PROCESSOR_ADDRESS=${paymentProcessorAddress}`);
  console.log(`NEXT_PUBLIC_RESEARCH_ORACLE_ADDRESS=${researchOracleAddress}`);
  console.log("========================================\n");
}

main().catch(console.error);
```

#### Step 5: Deploy

```bash
cd backend
npx hardhat run scripts/deploy-production.js --network sepolia
```

---

## Frontend Setup

### Package Dependencies

File: `frontend/package.json`
```json
{
  "dependencies": {
    "@zama-fhe/relayer-sdk": "^0.3.0-5",
    "ethers": "^6.9.0",
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.263.1",
    "framer-motion": "^10.16.4"
  }
}
```

### Critical Configuration Files

#### `frontend/next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  webpack: (config, { isServer }) => {
    // Remove existing WASM rules
    config.module.rules = config.module.rules.filter(
      rule => !rule.test?.toString().includes('wasm')
    );

    // Treat WASM as static assets
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/wasm/[name].[hash:8][ext]',
      },
    });

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      global: 'global',
    };

    // Polyfill for 'global' object
    config.plugins.push(
      new (require('webpack').DefinePlugin)({
        global: 'globalThis',
      })
    );

    // Suppress circular dependency warnings from relayer-sdk
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { message: /Circular dependency between chunks with runtime/ },
    ];

    return config;
  },
};

module.exports = nextConfig;
```

#### `frontend/lib/encryption.js` (Key File)
```javascript
'use client';

import { ethers } from 'ethers';

// ⚠️ IMPORTANT: Set to true after deploying real FHEVM contracts
const USE_REAL_FHE = false;

let fhevmInstance = null;
let initPromise = null;

const initFhevmInstance = async () => {
  if (!USE_REAL_FHE) {
    console.log('⚠️ Running in MOCK FHE mode - encryption is simulated');
    return { mock: true };
  }
  
  if (initPromise) return initPromise;
  
  if (typeof window === 'undefined') {
    throw new Error('FHE operations require browser environment');
  }

  initPromise = (async () => {
    try {
      console.log('📦 Importing @zama-fhe/relayer-sdk/web...');
      
      const relayerSDK = await import('@zama-fhe/relayer-sdk/web');
      const { initSDK, createInstance, SepoliaConfig } = relayerSDK;
      
      console.log('✅ Relayer SDK imported');
      
      // Initialize SDK first (loads WASM modules)
      console.log('🔧 Initializing SDK (loading WASM)...');
      await initSDK();
      console.log('✅ SDK initialized');
      
      if (!window.ethereum) {
        throw new Error('No wallet provider found. Please connect MetaMask.');
      }
      
      // Create instance with official SepoliaConfig
      // DO NOT manually set relayerUrl - SDK knows the correct one
      const instance = await createInstance({
        ...SepoliaConfig,
        network: window.ethereum,
      });
      
      console.log('✅ FHEVM instance created');
      return instance;
    } catch (error) {
      console.error('❌ Failed to initialize FHEVM:', error);
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
};

export async function getFHEInstance() {
  if (fhevmInstance) return fhevmInstance;
  fhevmInstance = await initFhevmInstance();
  return fhevmInstance;
}

// Helper for mock mode
function createMockHandle(value, index) {
  const hex = ethers.zeroPadValue(ethers.toBeHex(BigInt(value)), 32);
  console.log(`  Mock Handle[${index}]: ${hex} (value: ${value})`);
  return hex;
}

export async function encryptHealthData(contractAddress, userAddress, data) {
  const instance = await getFHEInstance();
  
  // MOCK MODE
  if (!USE_REAL_FHE || instance?.mock) {
    console.log('🔐 Creating MOCK encrypted input (NOT real encryption)');
    
    const handles = [
      createMockHandle(parseInt(data.age || 0), 0),
      createMockHandle(parseInt(data.diagnosis || 0), 1),
      createMockHandle(parseInt(data.outcome || 0), 2),
      createMockHandle(BigInt(data.biomarker || 0), 3),
    ];
    
    return { handles, inputProof: '0x' };
  }
  
  // REAL FHE MODE
  console.log('🔐 Creating REAL encrypted input...');
  
  const input = instance.createEncryptedInput(contractAddress, userAddress);
  input.add32(parseInt(data.age || 0));
  input.add32(parseInt(data.diagnosis || 0));
  input.add32(parseInt(data.outcome || 0));
  input.add64(BigInt(data.biomarker || 0));
  
  const encryptedData = await input.encrypt();
  
  // Convert handles to hex strings
  const handles = encryptedData.handles.map((handle, i) => {
    let hex;
    if (handle instanceof Uint8Array) {
      hex = '0x' + Array.from(handle).map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      hex = handle.startsWith?.('0x') ? handle : '0x' + handle;
    }
    if (hex.length < 66) hex = hex.padEnd(66, '0');
    return hex;
  });
  
  let inputProof = encryptedData.inputProof;
  if (inputProof instanceof Uint8Array) {
    inputProof = '0x' + Array.from(inputProof).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  return { handles, inputProof };
}
```

#### `frontend/lib/contracts.js`
```javascript
// Mode flag - should match USE_REAL_FHE in encryption.js
const USE_PRODUCTION_ABI = false;

export const CONTRACTS = {
  DataRegistry: {
    address: process.env.NEXT_PUBLIC_DATA_REGISTRY_ADDRESS,
    abi: [
      // For MOCK contracts (einput = uint256):
      {
        "inputs": [
          { "internalType": "uint256", "name": "encryptedAge", "type": "uint256" },
          { "internalType": "uint256", "name": "encryptedDiagnosis", "type": "uint256" },
          { "internalType": "uint256", "name": "encryptedOutcome", "type": "uint256" },
          { "internalType": "uint256", "name": "encryptedBiomarker", "type": "uint256" },
          { "internalType": "bytes", "name": "inputProof", "type": "bytes" }
        ],
        "name": "submitHealthData",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      // IMPORTANT: records() returns ALL 7 struct fields
      {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "records",
        "outputs": [
          { "internalType": "uint256", "name": "age", "type": "uint256" },
          { "internalType": "uint256", "name": "diagnosis", "type": "uint256" },
          { "internalType": "uint256", "name": "treatmentOutcome", "type": "uint256" },
          { "internalType": "uint256", "name": "biomarker", "type": "uint256" },
          { "internalType": "address", "name": "patient", "type": "address" },
          { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
          { "internalType": "bool", "name": "isActive", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      "function revokeRecord(uint256 recordId) external",
      "function getPatientRecords(address patient) external view returns (uint256[] memory)",
      "function recordCount() external view returns (uint256)",
      "event RecordSubmitted(uint256 indexed recordId, address indexed patient, uint256 timestamp)",
      "event RecordRevoked(uint256 indexed recordId, address indexed patient)"
    ]
  },
  PaymentProcessor: {
    address: process.env.NEXT_PUBLIC_PAYMENT_PROCESSOR_ADDRESS,
    abi: [
      "function getPatientEarnings(address patient) external view returns (uint256)",
      "function withdrawEarnings() external",
      "function getResearcherSpending(address researcher) external view returns (uint256)",
      "event EarningsDistributed(address indexed patient, uint256 amount)",
      "event EarningsWithdrawn(address indexed patient, uint256 amount)"
    ]
  },
  ResearchOracle: {
    address: process.env.NEXT_PUBLIC_RESEARCH_ORACLE_ADDRESS,
    abi: [
      "function computeAverageBiomarker(uint32 minAge, uint32 maxAge, uint32 diagnosisCode) external payable returns (uint256)",
      "function countPatientsByCriteria(uint32 diagnosisCode, uint32 minOutcome) external payable returns (uint256)",
      "function getQueryResult(uint256 queryId) external view returns (uint256, address, uint256, uint256, bool)",
      "function getResearcherQueries(address researcher) external view returns (uint256[] memory)",
      "function queryFee() external view returns (uint256)",
      "function getTotalQueries() external view returns (uint256)",
      "event QueryExecuted(uint256 indexed queryId, address indexed researcher, uint256 timestamp)"
    ]
  }
};

export const CHAIN_CONFIG = {
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '11155111'),
  chainName: 'Sepolia',
  rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
  blockExplorer: 'https://sepolia.etherscan.io'
};
```

---

## Environment Configuration

### Frontend: `frontend/.env.local`
```env
# Chain Configuration
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://rpc.sepolia.org

# Contract Addresses (update after deployment)
NEXT_PUBLIC_DATA_REGISTRY_ADDRESS=0xYOUR_DATA_REGISTRY_ADDRESS
NEXT_PUBLIC_PAYMENT_PROCESSOR_ADDRESS=0xYOUR_PAYMENT_PROCESSOR_ADDRESS
NEXT_PUBLIC_RESEARCH_ORACLE_ADDRESS=0xYOUR_RESEARCH_ORACLE_ADDRESS
```

### Backend: `backend/.env`
```env
# Deployment Configuration
MNEMONIC="your twelve word mnemonic phrase here"
INFURA_API_KEY=your_infura_project_id

# Optional: Etherscan verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

---

## Issues Fixed & Solutions

### Issue 1: React Hooks Violation
**Error:** `Invalid hook call. Hooks can only be called inside of the body of a function component.`

**Cause:** Hooks called inside async functions or useEffect callbacks.

**Solution:** Call hooks at component top level:
```javascript
// ✅ CORRECT
export default function Component() {
  const registryMethods = useDataRegistry(signer); // Top level
  
  const handleSubmit = async (data) => {
    await registryMethods.submitHealthData(data); // Use in handler
  };
}
```

### Issue 2: WASM Parse Errors
**Error:** `Module parse failed: Internal failure: parseVec could not cast the value`

**Solution:** Configure webpack to treat WASM as static assets (see next.config.js above).

### Issue 3: "global is not defined"
**Error:** `ReferenceError: global is not defined`

**Solution:** Add DefinePlugin: `global: 'globalThis'` in webpack config.

### Issue 4: Relayer URL Resolution
**Error:** `net::ERR_NAME_NOT_RESOLVED` for `https://relayer.zama.ai`

**Solution:** 
1. Update SDK to `@zama-fhe/relayer-sdk@0.3.0-5`
2. Use `initSDK()` before `createInstance()`
3. Use official `SepoliaConfig` - don't manually set relayer URL

### Issue 5: FHE SDK Not Initialized
**Error:** `Cannot read properties of undefined (reading '__wbindgen_malloc')`

**Solution:** Call `initSDK()` before `createInstance()`:
```javascript
const { initSDK, createInstance, SepoliaConfig } = await import('@zama-fhe/relayer-sdk/web');
await initSDK();  // ← This was missing!
const instance = await createInstance({ ...SepoliaConfig, network: window.ethereum });
```

### Issue 6: Contract Reverts with require(false)
**Error:** `execution reverted (likely require(false) occurred)`

**Cause:** Contracts deployed with mock TFHE library can't verify real FHE proofs.

**Solution:** Either:
- Use mock mode (`USE_REAL_FHE = false`) for testing
- Redeploy contracts with real `@fhevm/solidity` package

### Issue 7: Records Page Infinite Loop
**Error:** `Maximum update depth exceeded`

**Cause:** useEffect dependency on object that changes every render.

**Solution:** Use stable dependencies:
```javascript
useEffect(() => {
  // fetch logic
}, [isConnected, signer]); // ← Stable refs, not registryMethods object
```

### Issue 8: Circular Dependency Warnings
**Warning:** `Circular dependency between chunks with runtime`

**Solution:** Add to webpack config:
```javascript
config.ignoreWarnings = [
  { message: /Circular dependency between chunks with runtime/ },
];
```

### Issue 9: Records Display Wrong Data (Jan 1, 1970)
**Error:** Records show wrong patient address (`0x000...`) and timestamp (Jan 1, 1970)

**Cause:** The ABI for `records` mapping only declared 3 output fields, but the Solidity struct has 7 fields. The contract returns:
1. `age` (encrypted uint256)
2. `diagnosis` (encrypted uint256)
3. `treatmentOutcome` (encrypted uint256)
4. `biomarker` (encrypted uint256)
5. `patient` (address)
6. `timestamp` (uint256)
7. `isActive` (bool)

**Solution:** Update the ABI in `lib/contracts.js` to include all 7 fields:
```javascript
{
  "name": "records",
  "outputs": [
    { "internalType": "uint256", "name": "age", "type": "uint256" },
    { "internalType": "uint256", "name": "diagnosis", "type": "uint256" },
    { "internalType": "uint256", "name": "treatmentOutcome", "type": "uint256" },
    { "internalType": "uint256", "name": "biomarker", "type": "uint256" },
    { "internalType": "address", "name": "patient", "type": "address" },
    { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
    { "internalType": "bool", "name": "isActive", "type": "bool" }
  ],
  // ...
}
```

### Issue 10: Empty RecordCard Component
**Error:** `React.jsx: type is invalid -- expected a string or class/function but got: object`

**Cause:** `components/RecordCard.js` file was empty.

**Solution:** Create the RecordCard component with proper export.

### Issue 11: Dashboard Stats Not Updating
**Error:** Patient dashboard shows 0 records despite having records in "View Records"

**Cause:** `patient-dashboard-content.js` tried to lazy-load React hooks inside `useEffect`, which doesn't work.

**Solution:** Import hooks at component top level and fetch data properly:
```javascript
import { useWallet } from '@/hooks/useWallet';
import { useDataRegistry } from '@/hooks/useDataRegistry';
import { usePaymentProcessor } from '@/hooks/usePaymentProcessor';

export default function PatientDashboardContent() {
  const { signer, address, isConnected } = useWallet();
  const { getPatientRecords } = useDataRegistry(signer);
  const { getPatientEarnings } = usePaymentProcessor(signer);
  // ... fetch data in useEffect with proper dependencies
}
```

### Issue 12: Researcher Query Results Not Displaying
**Error:** Researcher results/spending pages show empty even after executing queries

**Cause:** Missing hook functions and pages didn't fetch data from contracts.

**Solution:** 
1. Added `getResearcherQueries()`, `getTotalQueries()` to `useResearchOracle.js`
2. Added `getResearcherSpending()`, `getStats()` to `usePaymentProcessor.js`
3. Added `queryResults` mapping to ABI in `contracts.js`
4. Updated researcher pages to fetch and display real data

### Issue 13: Payment Dust (Integer Division Remainder)
**Issue:** Integer division can leave tiny amounts stuck in contract

**Example:** 0.007 ETH / 3 patients = 0.00233... ETH each, 0.00001 ETH stuck

**Solution:** Added dust handling in `PaymentProcessor.sol`:
```solidity
uint256 dust = patientPool - actualDistributed;
if (dust > 0 && uniqueCount > 0) {
    patientEarnings[uniquePatients[0]] += dust;
}
```

---

## Production Deployment Checklist

### Backend
- [ ] Install `@fhevm/solidity` package
- [ ] Update contract imports to use real FHEVM
- [ ] Update contract inheritance (`ZamaEthereumConfig`)
- [ ] Set up `.env` with MNEMONIC and INFURA_API_KEY
- [ ] Fund deployer wallet with Sepolia ETH
- [ ] Run deployment script
- [ ] Save new contract addresses
- [ ] Verify contracts on Etherscan (optional)

### Frontend
- [ ] Update `.env.local` with new contract addresses
- [ ] Update `lib/contracts.js` ABI (uint256 → bytes32 for einput)
- [ ] Set `USE_REAL_FHE = true` in `lib/encryption.js`
- [ ] Test wallet connection
- [ ] Test form submission with real encryption
- [ ] Test records viewing
- [ ] Build production: `npm run build`

### Testing
- [ ] Submit health data as patient
- [ ] View records as patient
- [ ] Check earnings as patient
- [ ] Execute query as researcher
- [ ] View results as researcher

---

## File Structure

```
codespaces-blank/
├── backend/
│   ├── contracts/
│   │   ├── DataRegistry.sol
│   │   ├── PaymentProcessor.sol
│   │   └── ResearchOracle.sol
│   ├── fhevm/                    # Mock libraries (remove for production)
│   │   ├── lib/TFHE.sol
│   │   ├── config/ZamaFHEVMConfig.sol
│   │   └── gateway/GatewayCaller.sol
│   ├── scripts/
│   │   ├── deploy.js
│   │   └── deploy-testnet.js
│   ├── deployments/
│   │   └── sepolia-manual.json
│   ├── hardhat.config.js
│   └── package.json
│
├── frontend/
│   ├── app/
│   │   ├── layout.js
│   │   ├── page.js
│   │   ├── patient/
│   │   │   ├── page.js
│   │   │   ├── submit/
│   │   │   ├── records/
│   │   │   └── earnings/
│   │   └── researcher/
│   │       ├── query/
│   │       └── results/
│   ├── components/
│   │   ├── PatientForm.js
│   │   ├── WalletConnect.js
│   │   └── ...
│   ├── contexts/
│   │   └── WalletContext.js
│   ├── hooks/
│   │   ├── useWallet.js
│   │   ├── useDataRegistry.js
│   │   └── ...
│   ├── lib/
│   │   ├── encryption.js        # ⭐ Key file - mock/real mode
│   │   ├── contracts.js         # ⭐ Contract addresses & ABIs
│   │   └── utils.js
│   ├── next.config.js           # ⭐ WASM & webpack config
│   ├── .env.local               # ⭐ Environment variables
│   └── package.json
│
├── SETUP_GUIDE.md               # This file
└── blueprint.md
```

---

## Useful Commands

```bash
# Frontend
cd frontend
npm install                      # Install dependencies
npm run dev                      # Start dev server
npm run build                    # Production build
npm run lint                     # Check for errors

# Backend
cd backend
npm install                      # Install dependencies
npx hardhat compile              # Compile contracts
npx hardhat test                 # Run tests
npx hardhat run scripts/deploy-testnet.js --network sepolia  # Deploy

# Check contract deployment
curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_getCode","params":["CONTRACT_ADDRESS", "latest"],"id":1}' \
  https://ethereum-sepolia-rpc.publicnode.com
```

---

## Reference Links

- [Zama FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM React Template](https://github.com/0xchriswilder/fhevm-react-template)
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Sepolia Etherscan](https://sepolia.etherscan.io/)

---

*Last Updated: December 3, 2025*
