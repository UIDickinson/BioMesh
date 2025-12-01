# BioMesh Project - Complete Handoff Documentation

## Project Overview
**Name:** BioMesh - Encrypted Clinical Trial Data Marketplace  
**Tech Stack:** Solidity (fhEVM), React, Next.js, fhevmjs, ethers.js, TailwindCSS  
**Competition:** Zama Developer Program - Builder Track

## Problem & Solution
**Problem:** Clinical trial data is siloed, privacy-violating ($7.13M per breach), and patients can't monetize their data.  
**Solution:** Blockchain marketplace where patients submit encrypted health data (using Zama's FHE) and researchers query it without ever decrypting raw PII. Patients earn micropayments automatically.

---

## Backend Status: ✅ COMPLETE & DEPLOYED

### Deployed Contracts (Sepolia Testnet)
- **DataRegistry:** `0xb743ba11eea1aA78911127859550c1c119573cD5`
- **PaymentProcessor:** `0xaEfa63772566B79AEC9c0BabE2F55d76880b7591`
- **ResearchOracle:** `0xe0bfB2eBC8830b7ACD56A317Fc37DE8887743D1b`
- **Network:** Sepolia (ChainID: 11155111)
- **Deployer:** `0xC558F87a83BB747a5E7d19D6387D2dFBC0c0bA60`

### Backend Architecture

#### 1. DataRegistry.sol
**Purpose:** Store encrypted patient health data
**Key Functions:**
- `submitHealthData(einput age, einput diagnosis, einput outcome, einput biomarker, bytes proof)` → Returns recordId
- `revokeRecord(uint256 recordId)` → Patient revokes access
- `getPatientRecords(address patient)` → Returns array of recordIds
- `authorizeOracle(address oracle)` → Admin authorizes research oracle
- `grantOracleAccess(uint256 recordId, address oracle)` → Grant oracle access to encrypted fields

**Data Structure:**
```solidity
struct HealthRecord {
    euint32 age;              // Encrypted
    euint32 diagnosis;        // Encrypted
    euint32 treatmentOutcome; // Encrypted (0-100)
    euint64 biomarker;        // Encrypted
    address patient;
    uint256 timestamp;
    bool isActive;
}
```

#### 2. ResearchOracle.sol
**Purpose:** Execute encrypted queries on patient data
**Key Functions:**
- `computeAverageBiomarker(uint32 minAge, uint32 maxAge, uint32 diagnosisCode)` → Returns queryId
- `countPatientsByCriteria(uint32 diagnosisCode, uint32 minOutcome)` → Returns queryId
- `getQueryResult(uint256 queryId)` → Returns QueryResult struct
- `updateQueryFee(uint256 newFee)` → Admin updates fee

**Query Flow:**
1. Researcher pays query fee (0.01 ETH default)
2. Oracle iterates all records, performs FHE operations (TFHE.eq, TFHE.and, TFHE.select)
3. Returns encrypted results
4. Distributes payment to contributing patients (70%) and platform (30%)

#### 3. PaymentProcessor.sol
**Purpose:** Handle payment distribution
**Key Functions:**
- `distributeEarnings(uint256[] recordIds, address researcher)` → Called by oracle
- `withdrawEarnings()` → Patient withdraws earnings
- `getPatientEarnings(address patient)` → View earnings
- `updateFeeShares(uint256 patientShare, uint256 platformShare)` → Admin updates splits

**Fee Structure:**
- Patient Share: 70% (default)
- Platform Share: 30% (default)
- Configurable by owner

### Key FHE Operations Used
- `TFHE.asEuint32(einput, proof)` → Convert external encrypted input
- `TFHE.eq(a, b)` → Encrypted equality
- `TFHE.ge(a, b)` / `TFHE.le(a, b)` → Encrypted comparison
- `TFHE.and(cond1, cond2)` → Encrypted boolean AND
- `TFHE.select(condition, valueIfTrue, valueIfFalse)` → Encrypted ternary
- `TFHE.add(a, b)` → Encrypted addition
- `TFHE.allow(value, address)` → Grant decryption permission
- `TFHE.allowThis(value)` → Grant contract permission

### Backend File Structure
```
backend/
├── contracts/
│   ├── DataRegistry.sol
│   ├── ResearchOracle.sol
│   ├── PaymentProcessor.sol
|   |
|   ├── fhevm/                              # Mock
|   |   ├── config/ZamaFHEVMConfig.sol
|   |   ├── gateway/GatewayCaller.sol
│   |   └── lib/TFHE.sol
|   |
|   ├── deployments/sepolia-manual.json
|   |
│   └── interfaces/
│       ├── IDataRegistry.sol
│       └── IPaymentProcessor.sol
├── scripts/
│   ├── deploy.js
│   └── verify.js
├── test/
│   ├── DataRegistry.test.js
│   ├── PaymentProcessor.test.js
│   ├── ResearchOracle.test.js
│   └── integration/
│       └── full-flow.test.js
├── hardhat.config.js (viaIR: true)
├── package.json
└── .env
```

### Critical Backend Notes
1. **Compiler:** Must use `viaIR: true` in hardhat.config.js to avoid "stack too deep" errors
2. **FHE Limitation:** Cannot revert based on encrypted conditions (validation is performed but not enforced)
3. **Gas Optimization:** Query loops are expensive; production needs indexing/filtering
4. **Gateway:** Prepared for threshold decryption via GatewayCaller inheritance
5. **Access Control:** Oracle must be authorized in both DataRegistry and PaymentProcessor

---

## Frontend Requirements: 🎯 TO BE BUILT

### Technology Stack
- **Framework:** Next.js 14 (App Router)
- **Styling:** TailwindCSS
- **Web3:** ethers.js v6, fhevmjs v0.5+
- **State:** React hooks (useState, useEffect)
- **Wallet:** MetaMask integration
- **Icons:** Lucide React

### Frontend Architecture

#### User Flows

**Patient Flow:**
1. Connect MetaMask wallet
2. Navigate to "Submit Data" page
3. Fill form: age, diagnosis code, treatment outcome (0-100), biomarker value
4. Client-side encryption via fhevmjs
5. Submit to DataRegistry.submitHealthData()
6. View submitted records in "My Records"
7. Revoke access to records
8. View earnings dashboard
9. Withdraw earnings

**Researcher Flow:**
1. Connect MetaMask wallet
2. Navigate to "Run Query" page
3. Select query type (Average Biomarker / Count Patients)
4. Enter criteria: age range, diagnosis code, min outcome
5. Pay query fee (0.01 ETH)
6. Execute query via ResearchOracle
7. View encrypted results (with decrypt option if authorized)
8. View query history
9. See spending dashboard

### Key Frontend Components

#### 1. Wallet Connection
```javascript
const { provider, signer, address, connect, disconnect } = useWallet();
```

#### 2. FHE Encryption (Patient Data Submission)
```javascript
import { createInstance } from 'fhevmjs';

const instance = await createInstance({
  chainId: 11155111,
  networkUrl: SEPOLIA_RPC_URL,
  gatewayUrl: 'https://gateway.zama.ai'
});

const encryptedInput = await instance
  .createEncryptedInput(contractAddress, userAddress)
  .add32(age)
  .add32(diagnosisCode)
  .add32(outcome)
  .add64(biomarker)
  .encrypt();

await dataRegistry.submitHealthData(
  encryptedInput.handles[0],
  encryptedInput.handles[1],
  encryptedInput.handles[2],
  encryptedInput.handles[3],
  encryptedInput.inputProof
);
```

#### 3. Query Execution
```javascript
const queryFee = ethers.parseEther("0.01");
const tx = await researchOracle.computeAverageBiomarker(
  minAge, maxAge, diagnosisCode,
  { value: queryFee }
);
```

#### 4. Earnings Withdrawal
```javascript
const earnings = await paymentProcessor.getPatientEarnings(address);
await paymentProcessor.withdrawEarnings();
```

### Required Pages/Routes

```
/                          → Landing page (features, how it works)
/patient                   → Patient dashboard
/patient/submit            → Submit health data form
/patient/records           → View submitted records
/patient/earnings          → Earnings & withdraw
/researcher                → Researcher dashboard
/researcher/query          → Query builder
/researcher/results        → Query results history
/researcher/spending       → Payment history
/about                     → Project info, Zama competition
```

### Environment Variables (.env.local)
```bash
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://rpc.sepolia.org
NEXT_PUBLIC_DATA_REGISTRY_ADDRESS=0xb743ba11eea1aA78911127859550c1c119573cD5
NEXT_PUBLIC_PAYMENT_PROCESSOR_ADDRESS=0xaEfa63772566B79AEC9c0BabE2F55d76880b7591
NEXT_PUBLIC_RESEARCH_ORACLE_ADDRESS=0xe0bfB2eBC8830b7ACD56A317Fc37DE8887743D1b
NEXT_PUBLIC_GATEWAY_URL=https://gateway.zama.ai
```

### Critical Frontend Features

1. **Wallet Connection Component**
   - Detect MetaMask
   - Connect/disconnect
   - Display address & balance
   - Network validation (must be Sepolia)

2. **Data Encryption Module**
   - Initialize fhevmjs instance
   - Encrypt patient inputs before submission
   - Handle proof generation

3. **Contract Interaction Hooks**
   - `useDataRegistry()` - Submit, revoke, view records
   - `useResearchOracle()` - Execute queries, view results
   - `usePaymentProcessor()` - View earnings, withdraw

4. **Form Validation**
   - Age: 1-120
   - Diagnosis: Valid code (e.g., 250 for diabetes)
   - Outcome: 0-100
   - Biomarker: Numeric

5. **Loading States**
   - Transaction pending
   - Encryption in progress
   - Query execution

6. **Error Handling**
   - Network errors
   - Transaction rejections
   - Insufficient balance
   - Invalid inputs

### UI/UX Requirements

**Design Style:**
- Modern, medical/scientific aesthetic
- Dark mode friendly
- Responsive (mobile/desktop)
- Clear data visualizations (charts for earnings, query results)

**Key UI Elements:**
- Dashboard cards for stats
- Form inputs with validation
- Transaction status toasts/alerts
- Loading spinners
- Data tables (records, queries, earnings)
- Wallet connection modal
- Network switcher prompt

### Package Dependencies
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "ethers": "^6.9.0",
    "fhevmjs": "^0.5.0",
    "lucide-react": "^0.263.1",
    "tailwindcss": "^3.3.0"
  }
}
```

### Frontend File Structure (Expected)
```
frontend/
├── app/
│   ├── layout.js
│   ├── page.js (landing)
│   ├── patient/
│   │   ├── page.js
│   │   ├── submit/page.js
│   │   ├── records/page.js
│   │   └── earnings/page.js
│   ├── researcher/
│   │   ├── page.js
│   │   ├── query/page.js
│   │   ├── results/page.js
│   │   └── spending/page.js
│   └── about/page.js
├── components/
│   ├── Navbar.js
│   ├── WalletConnect.js
│   ├── PatientForm.js
│   ├── QueryBuilder.js
│   ├── RecordsList.js
│   ├── EarningsCard.js
│   └── QueryResults.js
├── hooks/
│   ├── useWallet.js
│   ├── useDataRegistry.js
│   ├── useResearchOracle.js
│   ├── usePaymentProcessor.js
│   └── useFHE.js
├── lib/
│   ├── contracts.js (ABIs & addresses)
│   ├── encryption.js (fhevmjs wrapper)
│   └── utils.js
├── public/
├── styles/
│   └── globals.css
├── .env.local
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## Instructions for AI to Generate Frontend

**Context:** You are building the frontend for BioMesh, an encrypted clinical trial data marketplace using Zama's fhEVM. The backend smart contracts are already deployed to Sepolia testnet.

**Task:** Generate a complete Next.js 14 frontend with:

1. **Two User Personas:**
   - Patients: Submit encrypted health data, view records, withdraw earnings
   - Researchers: Execute encrypted queries, view results, pay fees

2. **Core Functionality:**
   - MetaMask wallet connection
   - Client-side FHE encryption via fhevmjs
   - Contract interactions via ethers.js
   - Data submission, querying, payment flows

3. **Technical Requirements:**
   - Next.js 14 App Router
   - TailwindCSS for styling
   - Minimal comments in code
   - Single comprehensive README (no multiple md files)
   - Contract addresses and ABIs from backend deployment

4. **Must Include:**
   - All pages listed in "Required Pages/Routes"
   - All components listed in "Key UI Elements"
   - All hooks listed in "Contract Interaction Hooks"
   - Complete fhevmjs encryption implementation
   - Error handling and loading states

5. **Design:**
   - Modern, professional medical/tech aesthetic
   - Responsive layout
   - Clear data visualization
   - User-friendly forms

6. **Constraints:**
   - No localStorage/sessionStorage (use React state only)
   - Environment variables from .env.local
   - Keep code concise (omit unnecessary comments)

**Deployed Contract Info:**
- Network: Sepolia (ChainID 11155111)
- DataRegistry: 0xb743ba11eea1aA78911127859550c1c119573cD5
- PaymentProcessor: 0xaEfa63772566B79AEC9c0BabE2F55d76880b7591
- ResearchOracle: 0xe0bfB2eBC8830b7ACD56A317Fc37DE8887743D1b

**Reference Backend Repo Structure:** See "Backend File Structure" section above

**Output:** Provide complete file-by-file code for a production-ready frontend that integrates with the deployed contracts.

---

## Quick Start Commands

**Backend:**
```bash
cd backend
npm install
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network sepolia
```

**Frontend (once built):**
```bash
cd frontend
npm install
npm run dev
```

---

## Testing Checklist

**Backend:**
- [x] Contracts compile with viaIR: true
- [x] All 50+ tests pass
- [x] Deployed to Sepolia
- [x] Permissions configured

**Frontend (to verify):**
- [ ] MetaMask connects on Sepolia
- [ ] Patient can submit encrypted data
- [ ] Records display in dashboard
- [ ] Patient can revoke records
- [ ] Researcher can execute queries
- [ ] Query results return encrypted data
- [ ] Payments distribute correctly
- [ ] Patient can withdraw earnings
- [ ] All forms validate inputs
- [ ] Error states handled gracefully

---

## Demo Flow for Judges

1. **Landing Page:** Show problem/solution overview
2. **Patient Journey:**
   - Connect wallet
   - Submit health data (show encryption happening)
   - View record in dashboard
   - Show earnings accumulating
3. **Researcher Journey:**
   - Connect different wallet
   - Build query (age 30-60, diabetes)
   - Execute query (show payment transaction)
   - View encrypted results
4. **Back to Patient:**
   - Show earnings increased
   - Withdraw to wallet
5. **Highlight:** Never decrypted raw patient data throughout flow

---

## Submission Artifacts

**For Zama Competition:**
1. GitHub repo with backend + frontend
2. Deployed contract addresses (Sepolia)
3. Live demo URL (Vercel deployment)
4. 2-3 minute video walkthrough
5. README with setup instructions
6. Architecture diagram

**Etherscan Links:**
- https://sepolia.etherscan.io/address/0xb743ba11eea1aA78911127859550c1c119573cD5
- https://sepolia.etherscan.io/address/0xaEfa63772566B79AEC9c0BabE2F55d76880b7591
- https://sepolia.etherscan.io/address/0xe0bfB2eBC8830b7ACD56A317Fc37DE8887743D1b
