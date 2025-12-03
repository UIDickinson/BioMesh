/**
 * BioMesh Contract Definitions
 * 
 * This file contains ABIs and addresses for all BioMesh smart contracts.
 * 
 * IMPORTANT: The ABI for submitHealthData depends on whether contracts were
 * deployed with mock TFHE (einput = uint256) or real @fhevm/solidity (einput = bytes32).
 * 
 * Current deployment uses: MOCK (uint256)
 */

// Mode flag - should match NEXT_PUBLIC_USE_REAL_FHE in .env.local
const USE_PRODUCTION_ABI = process.env.NEXT_PUBLIC_USE_PRODUCTION_ABI === 'true';

// ABI for submitHealthData - MOCK mode (einput = uint256)
const SUBMIT_HEALTH_DATA_MOCK = {
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
};

// ABI for submitHealthData - PRODUCTION mode (einput = bytes32)
const SUBMIT_HEALTH_DATA_PRODUCTION = {
  "inputs": [
    { "internalType": "bytes32", "name": "encryptedAge", "type": "bytes32" },
    { "internalType": "bytes32", "name": "encryptedDiagnosis", "type": "bytes32" },
    { "internalType": "bytes32", "name": "encryptedOutcome", "type": "bytes32" },
    { "internalType": "bytes32", "name": "encryptedBiomarker", "type": "bytes32" },
    { "internalType": "bytes", "name": "inputProof", "type": "bytes" }
  ],
  "name": "submitHealthData",
  "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
  "stateMutability": "nonpayable",
  "type": "function"
};

export const CONTRACTS = {
  DataRegistry: {
    address: process.env.NEXT_PUBLIC_DATA_REGISTRY_ADDRESS,
    abi: [
      // Select ABI based on deployment mode
      USE_PRODUCTION_ABI ? SUBMIT_HEALTH_DATA_PRODUCTION : SUBMIT_HEALTH_DATA_MOCK,
      
      // Other functions (same for both modes)
      {
        "inputs": [{ "internalType": "uint256", "name": "recordId", "type": "uint256" }],
        "name": "revokeRecord",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "address", "name": "patient", "type": "address" }],
        "name": "getPatientRecords",
        "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
        "stateMutability": "view",
        "type": "function"
      },
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
      {
        "inputs": [],
        "name": "recordCount",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "uint256", "name": "recordId", "type": "uint256" },
          { "indexed": true, "internalType": "address", "name": "patient", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "RecordSubmitted",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "uint256", "name": "recordId", "type": "uint256" },
          { "indexed": true, "internalType": "address", "name": "patient", "type": "address" }
        ],
        "name": "RecordRevoked",
        "type": "event"
      }
    ]
  },
  
  PaymentProcessor: {
    address: process.env.NEXT_PUBLIC_PAYMENT_PROCESSOR_ADDRESS,
    abi: [
      {
        "inputs": [{ "internalType": "address", "name": "patient", "type": "address" }],
        "name": "getPatientEarnings",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "withdrawEarnings",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "address", "name": "researcher", "type": "address" }],
        "name": "getResearcherSpending",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "getStats",
        "outputs": [
          { "internalType": "uint256", "name": "totalFees", "type": "uint256" },
          { "internalType": "uint256", "name": "totalDist", "type": "uint256" },
          { "internalType": "uint256", "name": "contractBal", "type": "uint256" },
          { "internalType": "uint256", "name": "unclaimed", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "patient", "type": "address" },
          { "indexed": true, "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "recordCount", "type": "uint256" }
        ],
        "name": "EarningsDistributed",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "patient", "type": "address" },
          { "indexed": true, "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "EarningsWithdrawn",
        "type": "event"
      }
    ]
  },
  
  ResearchOracle: {
    address: process.env.NEXT_PUBLIC_RESEARCH_ORACLE_ADDRESS,
    abi: [
      {
        "inputs": [
          { "internalType": "uint32", "name": "minAge", "type": "uint32" },
          { "internalType": "uint32", "name": "maxAge", "type": "uint32" },
          { "internalType": "uint32", "name": "diagnosisCode", "type": "uint32" }
        ],
        "name": "computeAverageBiomarker",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "payable",
        "type": "function"
      },
      {
        "inputs": [
          { "internalType": "uint32", "name": "diagnosisCode", "type": "uint32" },
          { "internalType": "uint32", "name": "minOutcome", "type": "uint32" }
        ],
        "name": "countPatientsByCriteria",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "payable",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "uint256", "name": "queryId", "type": "uint256" }],
        "name": "getQueryResult",
        "outputs": [
          { "internalType": "uint256", "name": "queryId", "type": "uint256" },
          { "internalType": "address", "name": "researcher", "type": "address" },
          { "internalType": "uint256", "name": "recordCount", "type": "uint256" },
          { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
          { "internalType": "bool", "name": "isDecrypted", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "address", "name": "researcher", "type": "address" }],
        "name": "getResearcherQueries",
        "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "queryFee",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "getTotalQueries",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "queryResults",
        "outputs": [
          { "internalType": "uint256", "name": "queryId", "type": "uint256" },
          { "internalType": "address", "name": "researcher", "type": "address" },
          { "internalType": "uint256", "name": "recordCount", "type": "uint256" },
          { "internalType": "uint256", "name": "encryptedSum", "type": "uint256" },
          { "internalType": "uint256", "name": "encryptedCount", "type": "uint256" },
          { "internalType": "uint256", "name": "timestamp", "type": "uint256" },
          { "internalType": "bool", "name": "isDecrypted", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "uint256", "name": "queryId", "type": "uint256" },
          { "indexed": true, "internalType": "address", "name": "researcher", "type": "address" },
          { "indexed": true, "internalType": "uint256", "name": "timestamp", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "recordCount", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "fee", "type": "uint256" }
        ],
        "name": "QueryExecuted",
        "type": "event"
      }
    ]
  }
};

export const CHAIN_CONFIG = {
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '11155111'),
  chainName: 'Sepolia',
  rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
  blockExplorer: 'https://sepolia.etherscan.io'
};

// Helper to get block explorer URL for a transaction or address
export function getExplorerUrl(hashOrAddress, type = 'tx') {
  return `${CHAIN_CONFIG.blockExplorer}/${type}/${hashOrAddress}`;
}

// Helper to check if contracts are configured
export function areContractsConfigured() {
  return !!(
    CONTRACTS.DataRegistry.address &&
    CONTRACTS.PaymentProcessor.address &&
    CONTRACTS.ResearchOracle.address
  );
}