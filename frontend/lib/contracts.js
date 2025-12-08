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
// Expanded to 9 fields: age, gender, ethnicity, diagnosis, outcome, biomarker, bmi, systolicBP, diastolicBP
const SUBMIT_HEALTH_DATA_MOCK = {
  "inputs": [
    { "internalType": "uint256", "name": "encryptedAge", "type": "uint256" },
    { "internalType": "uint256", "name": "encryptedGender", "type": "uint256" },
    { "internalType": "uint256", "name": "encryptedEthnicity", "type": "uint256" },
    { "internalType": "uint256", "name": "encryptedDiagnosis", "type": "uint256" },
    { "internalType": "uint256", "name": "encryptedOutcome", "type": "uint256" },
    { "internalType": "uint256", "name": "encryptedBiomarker", "type": "uint256" },
    { "internalType": "uint256", "name": "encryptedBMI", "type": "uint256" },
    { "internalType": "uint256", "name": "encryptedSystolicBP", "type": "uint256" },
    { "internalType": "uint256", "name": "encryptedDiastolicBP", "type": "uint256" },
    { "internalType": "bytes", "name": "inputProof", "type": "bytes" }
  ],
  "name": "submitHealthData",
  "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
  "stateMutability": "nonpayable",
  "type": "function"
};

// ABI for submitHealthData - PRODUCTION mode (einput = bytes32)
// Expanded to 9 fields: age, gender, ethnicity, diagnosis, outcome, biomarker, bmi, systolicBP, diastolicBP
const SUBMIT_HEALTH_DATA_PRODUCTION = {
  "inputs": [
    { "internalType": "bytes32", "name": "encryptedAge", "type": "bytes32" },
    { "internalType": "bytes32", "name": "encryptedGender", "type": "bytes32" },
    { "internalType": "bytes32", "name": "encryptedEthnicity", "type": "bytes32" },
    { "internalType": "bytes32", "name": "encryptedDiagnosis", "type": "bytes32" },
    { "internalType": "bytes32", "name": "encryptedOutcome", "type": "bytes32" },
    { "internalType": "bytes32", "name": "encryptedBiomarker", "type": "bytes32" },
    { "internalType": "bytes32", "name": "encryptedBMI", "type": "bytes32" },
    { "internalType": "bytes32", "name": "encryptedSystolicBP", "type": "bytes32" },
    { "internalType": "bytes32", "name": "encryptedDiastolicBP", "type": "bytes32" },
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
          { "internalType": "uint256", "name": "gender", "type": "uint256" },
          { "internalType": "uint256", "name": "ethnicity", "type": "uint256" },
          { "internalType": "uint256", "name": "diagnosis", "type": "uint256" },
          { "internalType": "uint256", "name": "treatmentOutcome", "type": "uint256" },
          { "internalType": "uint256", "name": "biomarker", "type": "uint256" },
          { "internalType": "uint256", "name": "bmi", "type": "uint256" },
          { "internalType": "uint256", "name": "systolicBP", "type": "uint256" },
          { "internalType": "uint256", "name": "diastolicBP", "type": "uint256" },
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
      },
      // Consent Management
      {
        "inputs": [
          { "internalType": "uint256", "name": "recordId", "type": "uint256" },
          { "internalType": "uint8", "name": "consentLevel", "type": "uint8" }
        ],
        "name": "setConsent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          { "internalType": "uint256", "name": "recordId", "type": "uint256" },
          { "internalType": "uint8", "name": "newConsent", "type": "uint8" }
        ],
        "name": "updateConsentLevel",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "uint256", "name": "recordId", "type": "uint256" }],
        "name": "getRecordConsent",
        "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "uint256", "name": "recordId", "type": "uint256" }],
        "name": "hasIndividualConsent",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "uint256", "name": "recordId", "type": "uint256" },
          { "indexed": false, "internalType": "uint8", "name": "newConsent", "type": "uint8" }
        ],
        "name": "ConsentUpdated",
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
          { "internalType": "bool", "name": "isDecrypted", "type": "bool" },
          { "internalType": "uint64", "name": "decryptedSum", "type": "uint64" },
          { "internalType": "uint32", "name": "decryptedCount", "type": "uint32" }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      // Decryption functions
      {
        "inputs": [{ "internalType": "uint256", "name": "queryId", "type": "uint256" }],
        "name": "getEncryptedHandles",
        "outputs": [
          { "internalType": "uint256", "name": "sumHandle", "type": "uint256" },
          { "internalType": "uint256", "name": "countHandle", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "uint256", "name": "queryId", "type": "uint256" }],
        "name": "requestDecryption",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "uint256", "name": "queryId", "type": "uint256" }],
        "name": "isDecryptionRequested",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          { "internalType": "uint256", "name": "queryId", "type": "uint256" },
          { "internalType": "uint64", "name": "decryptedSum", "type": "uint64" },
          { "internalType": "uint32", "name": "decryptedCount", "type": "uint32" },
          { "internalType": "bytes", "name": "decryptionProof", "type": "bytes" }
        ],
        "name": "submitDecryptedResult",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "uint256", "name": "queryId", "type": "uint256" }],
        "name": "getDecryptedResult",
        "outputs": [
          { "internalType": "uint64", "name": "sum", "type": "uint64" },
          { "internalType": "uint32", "name": "count", "type": "uint32" },
          { "internalType": "uint64", "name": "average", "type": "uint64" },
          { "internalType": "bool", "name": "isReady", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "uint256", "name": "queryId", "type": "uint256" },
          { "indexed": true, "internalType": "address", "name": "researcher", "type": "address" }
        ],
        "name": "DecryptionRequested",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "uint256", "name": "queryId", "type": "uint256" },
          { "indexed": true, "internalType": "address", "name": "researcher", "type": "address" },
          { "indexed": false, "internalType": "uint64", "name": "decryptedSum", "type": "uint64" },
          { "indexed": false, "internalType": "uint32", "name": "decryptedCount", "type": "uint32" }
        ],
        "name": "DecryptionCompleted",
        "type": "event"
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
      },
      // Individual Records Query
      {
        "inputs": [],
        "name": "individualQueryFee",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          { "internalType": "uint32", "name": "minAge", "type": "uint32" },
          { "internalType": "uint32", "name": "maxAge", "type": "uint32" },
          { "internalType": "uint32", "name": "diagnosisCode", "type": "uint32" }
        ],
        "name": "queryIndividualRecords",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "payable",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "uint256", "name": "queryId", "type": "uint256" }],
        "name": "getIndividualQueryResults",
        "outputs": [
          { "internalType": "uint256[]", "name": "recordIds", "type": "uint256[]" },
          { "internalType": "bool", "name": "kAnonymityMet", "type": "bool" },
          { "internalType": "uint256", "name": "totalMatching", "type": "uint256" },
          { "internalType": "uint256", "name": "individualAccessCount", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "uint256", "name": "queryId", "type": "uint256" },
          { "indexed": true, "internalType": "address", "name": "researcher", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "totalMatching", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "individualAccessCount", "type": "uint256" },
          { "indexed": false, "internalType": "bool", "name": "kAnonymityMet", "type": "bool" }
        ],
        "name": "IndividualQueryExecuted",
        "type": "event"
      }
    ]
  },
  
  VerificationRegistry: {
    address: process.env.NEXT_PUBLIC_VERIFICATION_REGISTRY_ADDRESS,
    abi: [
      // Stake Functions
      {
        "inputs": [{ "internalType": "uint256", "name": "recordId", "type": "uint256" }],
        "name": "depositStake",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "uint256", "name": "recordId", "type": "uint256" }],
        "name": "returnStake",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      // AI Verification Functions
      {
        "inputs": [
          { "internalType": "uint256", "name": "recordId", "type": "uint256" },
          { "internalType": "bytes32", "name": "documentHash", "type": "bytes32" },
          { "internalType": "uint8", "name": "evidenceType", "type": "uint8" }
        ],
        "name": "requestAIVerification",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          { "internalType": "uint256", "name": "recordId", "type": "uint256" },
          { "internalType": "uint8", "name": "confidenceScore", "type": "uint8" },
          { "internalType": "string", "name": "extractionSummary", "type": "string" }
        ],
        "name": "submitAIVerification",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      // Provider Attestation Functions
      {
        "inputs": [
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "string", "name": "licenseNumber", "type": "string" }
        ],
        "name": "registerProvider",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "uint256", "name": "recordId", "type": "uint256" }],
        "name": "attestRecord",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      // Flagging/Slashing Functions
      {
        "inputs": [
          { "internalType": "uint256", "name": "recordId", "type": "uint256" },
          { "internalType": "string", "name": "reason", "type": "string" }
        ],
        "name": "flagRecord",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "withdrawSlashRewards",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      // View Functions
      {
        "inputs": [{ "internalType": "uint256", "name": "recordId", "type": "uint256" }],
        "name": "getVerification",
        "outputs": [
          {
            "components": [
              { "internalType": "uint8", "name": "status", "type": "uint8" },
              { "internalType": "uint8", "name": "evidenceType", "type": "uint8" },
              { "internalType": "bytes32", "name": "documentHash", "type": "bytes32" },
              { "internalType": "uint8", "name": "aiConfidenceScore", "type": "uint8" },
              { "internalType": "address", "name": "attestingProvider", "type": "address" },
              { "internalType": "uint256", "name": "stakeAmount", "type": "uint256" },
              { "internalType": "uint256", "name": "verificationTimestamp", "type": "uint256" },
              { "internalType": "string", "name": "aiExtractionSummary", "type": "string" }
            ],
            "internalType": "struct VerificationRegistry.Verification",
            "name": "",
            "type": "tuple"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "address", "name": "patient", "type": "address" }],
        "name": "getReputation",
        "outputs": [
          {
            "components": [
              { "internalType": "uint256", "name": "totalSubmissions", "type": "uint256" },
              { "internalType": "uint256", "name": "verifiedCount", "type": "uint256" },
              { "internalType": "uint256", "name": "flaggedCount", "type": "uint256" },
              { "internalType": "uint256", "name": "slashedCount", "type": "uint256" },
              { "internalType": "uint16", "name": "reputationScore", "type": "uint16" },
              { "internalType": "uint256", "name": "lastUpdated", "type": "uint256" }
            ],
            "internalType": "struct VerificationRegistry.Reputation",
            "name": "",
            "type": "tuple"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "address", "name": "patient", "type": "address" }],
        "name": "getReputationScore",
        "outputs": [{ "internalType": "uint16", "name": "score", "type": "uint16" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "uint256", "name": "recordId", "type": "uint256" }],
        "name": "calculateTrustScore",
        "outputs": [{ "internalType": "uint8", "name": "trustScore", "type": "uint8" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "address", "name": "provider", "type": "address" }],
        "name": "isProviderRegistered",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "name": "slashRewards",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      },
      // Constants
      {
        "inputs": [],
        "name": "MIN_STAKE",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "MAX_STAKE",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "AI_CONFIDENCE_THRESHOLD",
        "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "DISPUTE_WINDOW",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      },
      // Events
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "uint256", "name": "recordId", "type": "uint256" },
          { "indexed": true, "internalType": "address", "name": "patient", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "StakeDeposited",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "uint256", "name": "recordId", "type": "uint256" },
          { "indexed": true, "internalType": "address", "name": "patient", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "StakeReturned",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "uint256", "name": "recordId", "type": "uint256" },
          { "indexed": false, "internalType": "bytes32", "name": "documentHash", "type": "bytes32" },
          { "indexed": false, "internalType": "uint8", "name": "evidenceType", "type": "uint8" }
        ],
        "name": "AIVerificationRequested",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "uint256", "name": "recordId", "type": "uint256" },
          { "indexed": false, "internalType": "uint8", "name": "confidenceScore", "type": "uint8" },
          { "indexed": false, "internalType": "bool", "name": "passed", "type": "bool" }
        ],
        "name": "AIVerificationCompleted",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "uint256", "name": "recordId", "type": "uint256" },
          { "indexed": true, "internalType": "address", "name": "provider", "type": "address" }
        ],
        "name": "ProviderAttestationSubmitted",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "patient", "type": "address" },
          { "indexed": false, "internalType": "uint16", "name": "newScore", "type": "uint16" }
        ],
        "name": "ReputationUpdated",
        "type": "event"
      }
    ]
  },
  
  ConsentRegistry: {
    address: process.env.NEXT_PUBLIC_CONSENT_REGISTRY_ADDRESS,
    abi: [
      // World ID Verification
      {
        "inputs": [
          { "internalType": "uint256", "name": "nullifierHash", "type": "uint256" },
          { "internalType": "bytes", "name": "proof", "type": "bytes" }
        ],
        "name": "verifyWorldId",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
        "name": "isUserWorldIdVerified",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "name": "worldIdVerifications",
        "outputs": [
          { "internalType": "bool", "name": "isVerified", "type": "bool" },
          { "internalType": "uint256", "name": "nullifierHash", "type": "uint256" },
          { "internalType": "uint256", "name": "verificationTime", "type": "uint256" },
          { "internalType": "uint256", "name": "expirationTime", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      // Patient Consent
      {
        "inputs": [
          { "internalType": "bool", "name": "acknowledgesDataUsage", "type": "bool" },
          { "internalType": "bool", "name": "acknowledgesAnonymization", "type": "bool" },
          { "internalType": "bool", "name": "acknowledgesPaymentTerms", "type": "bool" },
          { "internalType": "bool", "name": "acknowledgesRevocationRights", "type": "bool" },
          { "internalType": "bool", "name": "acknowledgesRisks", "type": "bool" },
          { "internalType": "bool", "name": "acceptsAggregateQueries", "type": "bool" },
          { "internalType": "bool", "name": "acceptsIndividualQueries", "type": "bool" },
          { "internalType": "uint8", "name": "minimumPaymentTier", "type": "uint8" },
          { "internalType": "uint8", "name": "dataRetentionMonths", "type": "uint8" },
          { "internalType": "bool", "name": "allowsInternationalResearch", "type": "bool" }
        ],
        "name": "submitPatientConsent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "revokePatientConsent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "address", "name": "patient", "type": "address" }],
        "name": "hasActivePatientConsent",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "address", "name": "patient", "type": "address" }],
        "name": "getPatientConsent",
        "outputs": [
          {
            "components": [
              { "internalType": "uint8", "name": "status", "type": "uint8" },
              { "internalType": "uint256", "name": "consentTimestamp", "type": "uint256" },
              { "internalType": "uint256", "name": "lastUpdated", "type": "uint256" },
              { "internalType": "bool", "name": "acknowledgesDataUsage", "type": "bool" },
              { "internalType": "bool", "name": "acknowledgesAnonymization", "type": "bool" },
              { "internalType": "bool", "name": "acknowledgesPaymentTerms", "type": "bool" },
              { "internalType": "bool", "name": "acknowledgesRevocationRights", "type": "bool" },
              { "internalType": "bool", "name": "acknowledgesRisks", "type": "bool" },
              { "internalType": "bool", "name": "acceptsAggregateQueries", "type": "bool" },
              { "internalType": "bool", "name": "acceptsIndividualQueries", "type": "bool" },
              { "internalType": "uint8", "name": "minimumPaymentTier", "type": "uint8" },
              { "internalType": "uint8", "name": "dataRetentionMonths", "type": "uint8" },
              { "internalType": "bool", "name": "allowsInternationalResearch", "type": "bool" },
              { "internalType": "bytes32", "name": "consentHash", "type": "bytes32" }
            ],
            "internalType": "struct ConsentRegistry.PatientConsent",
            "name": "",
            "type": "tuple"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      // Researcher Consent
      {
        "inputs": [
          { "internalType": "bool", "name": "acknowledgesDataPrivacy", "type": "bool" },
          { "internalType": "bool", "name": "acknowledgesEthicalUse", "type": "bool" },
          { "internalType": "bool", "name": "acknowledgesPaymentTerms", "type": "bool" },
          { "internalType": "bool", "name": "acknowledgesDataLimitations", "type": "bool" },
          { "internalType": "bool", "name": "acknowledgesSecurityObligations", "type": "bool" },
          { "internalType": "string", "name": "institutionName", "type": "string" },
          { "internalType": "string", "name": "researchPurpose", "type": "string" },
          { "internalType": "bool", "name": "isInstitutionalReviewed", "type": "bool" },
          { "internalType": "string", "name": "irpApprovalReference", "type": "string" },
          { "internalType": "bool", "name": "agreesToNotRedistribute", "type": "bool" },
          { "internalType": "bool", "name": "agreesToCiteDataSource", "type": "bool" },
          { "internalType": "bool", "name": "agreesToReportFindings", "type": "bool" }
        ],
        "name": "submitResearcherConsent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "revokeResearcherConsent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "address", "name": "researcher", "type": "address" }],
        "name": "hasActiveResearcherConsent",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "address", "name": "researcher", "type": "address" }],
        "name": "getResearcherConsent",
        "outputs": [
          {
            "components": [
              { "internalType": "uint8", "name": "status", "type": "uint8" },
              { "internalType": "uint256", "name": "consentTimestamp", "type": "uint256" },
              { "internalType": "uint256", "name": "lastUpdated", "type": "uint256" },
              { "internalType": "bool", "name": "acknowledgesDataPrivacy", "type": "bool" },
              { "internalType": "bool", "name": "acknowledgesEthicalUse", "type": "bool" },
              { "internalType": "bool", "name": "acknowledgesPaymentTerms", "type": "bool" },
              { "internalType": "bool", "name": "acknowledgesDataLimitations", "type": "bool" },
              { "internalType": "bool", "name": "acknowledgesSecurityObligations", "type": "bool" },
              { "internalType": "string", "name": "institutionName", "type": "string" },
              { "internalType": "string", "name": "researchPurpose", "type": "string" },
              { "internalType": "bool", "name": "isInstitutionalReviewed", "type": "bool" },
              { "internalType": "string", "name": "irpApprovalReference", "type": "string" },
              { "internalType": "bool", "name": "agreesToNotRedistribute", "type": "bool" },
              { "internalType": "bool", "name": "agreesToCiteDataSource", "type": "bool" },
              { "internalType": "bool", "name": "agreesToReportFindings", "type": "bool" },
              { "internalType": "bytes32", "name": "consentHash", "type": "bytes32" }
            ],
            "internalType": "struct ConsentRegistry.ResearcherConsent",
            "name": "",
            "type": "tuple"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      // Composite Checks
      {
        "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
        "name": "canSubmitData",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
        "name": "canExecuteQueries",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
        "name": "canSubmitDataWithTrust",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
        "name": "canExecuteQueriesWithTrust",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
        "name": "getUserStatus",
        "outputs": [
          { "internalType": "bool", "name": "isWorldIdVerified_", "type": "bool" },
          { "internalType": "bool", "name": "hasPatientConsent_", "type": "bool" },
          { "internalType": "bool", "name": "hasResearcherConsent_", "type": "bool" },
          { "internalType": "uint8", "name": "role", "type": "uint8" }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "getPaymentTerms",
        "outputs": [
          { "internalType": "uint256", "name": "patientShare", "type": "uint256" },
          { "internalType": "uint256", "name": "platformShare", "type": "uint256" },
          { "internalType": "uint256", "name": "baseQueryFee", "type": "uint256" },
          { "internalType": "uint256", "name": "individualQueryFee", "type": "uint256" }
        ],
        "stateMutability": "pure",
        "type": "function"
      },
      // Events
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "nullifierHash", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "WorldIdVerified",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "patient", "type": "address" },
          { "indexed": false, "internalType": "bytes32", "name": "consentHash", "type": "bytes32" },
          { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "PatientConsentGiven",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "patient", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "PatientConsentRevoked",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "researcher", "type": "address" },
          { "indexed": false, "internalType": "bytes32", "name": "consentHash", "type": "bytes32" },
          { "indexed": false, "internalType": "string", "name": "institution", "type": "string" },
          { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "ResearcherConsentGiven",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "address", "name": "researcher", "type": "address" },
          { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "name": "ResearcherConsentRevoked",
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