// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";

/**
 * @title DataRegistry
 * @notice Stores and manages encrypted patient health data
 * @dev Uses Zama's fhEVM for fully homomorphic encryption
 */
contract DataRegistry is SepoliaZamaFHEVMConfig, GatewayCaller {
    
    // ============ State Variables ============
    
    /// @notice Patient health data stored as encrypted integers
    struct HealthRecord {
        euint32 age;              // Encrypted age
        euint32 diagnosis;        // Encrypted diagnosis code
        euint32 treatmentOutcome; // Encrypted outcome score (0-100)
        euint64 biomarker;        // Encrypted lab value
        address patient;          // Patient wallet address
        uint256 timestamp;        // Submission timestamp
        bool isActive;            // Record active status
    }
    
    /// @notice Mapping: recordId => HealthRecord
    mapping(uint256 => HealthRecord) public records;
    
    /// @notice Mapping: patient address => array of recordIds
    mapping(address => uint256[]) private patientRecordIds;
    
    /// @notice Mapping: diagnosis code => array of recordIds (for efficient querying)
    mapping(uint32 => uint256[]) private diagnosisIndex;
    
    /// @notice Counter for record IDs
    uint256 public recordCount;
    
    /// @notice Authorized research oracles
    mapping(address => bool) public authorizedOracles;
    
    /// @notice Contract owner
    address public owner;
    
    /// @notice Maximum batch size to prevent DoS attacks
    uint256 public constant MAX_BATCH_SIZE = 100;
    
    // ============ Events ============
    
    event RecordSubmitted(
        uint256 indexed recordId, 
        address indexed patient,
        uint256 indexed timestamp
    );
    
    event RecordRevoked(
        uint256 indexed recordId, 
        address indexed patient
    );
    
    event OracleAuthorized(address indexed oracle);
    event OracleRevoked(address indexed oracle);
    event AccessGranted(uint256 indexed recordId, address indexed oracle);
    event BatchAccessGranted(uint256[] recordIds, address indexed oracle, uint256 count);
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyRecordOwner(uint256 recordId) {
        require(records[recordId].patient == msg.sender, "Not record owner");
        _;
    }
    
    modifier onlyAuthorizedOracle() {
        require(authorizedOracles[msg.sender], "Not authorized oracle");
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        owner = msg.sender;
    }
    
    // ============ Core Functions ============
    
    /**
     * @notice Submit encrypted health data
     * @param encryptedAge Encrypted age value with proof
     * @param encryptedDiagnosis Encrypted diagnosis code with proof
     * @param encryptedOutcome Encrypted treatment outcome with proof
     * @param encryptedBiomarker Encrypted biomarker value with proof
     * @return recordId The ID of the newly created record
     */
    function submitHealthData(
        einput encryptedAge,
        einput encryptedDiagnosis,
        einput encryptedOutcome,
        einput encryptedBiomarker,
        bytes calldata inputProof
    ) external returns (uint256) {
        
        // Verify and convert encrypted inputs
        euint32 age = TFHE.asEuint32(encryptedAge, inputProof);
        euint32 diagnosis = TFHE.asEuint32(encryptedDiagnosis, inputProof);
        euint32 outcome = TFHE.asEuint32(encryptedOutcome, inputProof);
        euint64 biomarker = TFHE.asEuint64(encryptedBiomarker, inputProof);
        
        // Basic validation - check age is reasonable (encrypted comparison)
        // NOTE: FHE Limitation - Cannot revert based on encrypted conditions
        // Validation is performed but cannot enforce constraints with encrypted reverts.
        // In production, use gateway-based decryption for critical validations.
        ebool validAge = TFHE.and(
            TFHE.ge(age, TFHE.asEuint32(1)),
            TFHE.le(age, TFHE.asEuint32(120))
        );
        
        // Outcome should be 0-100
        ebool validOutcome = TFHE.le(outcome, TFHE.asEuint32(100));
        
        // Both conditions must be true (simplified validation)
        // Note: In production, you'd decrypt isValid to check, but for demo we proceed
        // Note: This is a limitation - can't revert based on encrypted condition
        TFHE.and(validAge, validOutcome); // Combined validation (unused in FHE context)
        
        // Create new record
        uint256 recordId = recordCount++;
        
        records[recordId] = HealthRecord({
            age: age,
            diagnosis: diagnosis,
            treatmentOutcome: outcome,
            biomarker: biomarker,
            patient: msg.sender,
            timestamp: block.timestamp,
            isActive: true
        });
        
        // Allow contract to access encrypted data for queries
        TFHE.allowThis(age);
        TFHE.allowThis(diagnosis);
        TFHE.allowThis(outcome);
        TFHE.allowThis(biomarker);
        
        // Allow patient to access their own data
        TFHE.allow(age, msg.sender);
        TFHE.allow(diagnosis, msg.sender);
        TFHE.allow(outcome, msg.sender);
        TFHE.allow(biomarker, msg.sender);
        
        // Track patient's records
        patientRecordIds[msg.sender].push(recordId);
        
        emit RecordSubmitted(recordId, msg.sender, block.timestamp);
        
        return recordId;
    }
    
    /**
     * @notice Revoke access to patient's health data
     * @param recordId The ID of the record to revoke
     */
    function revokeRecord(uint256 recordId) 
        external 
        onlyRecordOwner(recordId) 
    {
        require(records[recordId].isActive, "Record already revoked");
        
        records[recordId].isActive = false;
        
        emit RecordRevoked(recordId, msg.sender);
    }
    
    /**
     * @notice Get patient's record IDs
     * @param patient The patient's address
     * @return Array of record IDs owned by the patient
     */
    function getPatientRecords(address patient) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return patientRecordIds[patient];
    }
    
    /**
     * @notice Get record details (only accessible by patient or authorized oracle)
     * @param recordId The record ID
     * @return HealthRecord struct
     */
    function getRecord(uint256 recordId) 
        external 
        view 
        returns (HealthRecord memory) 
    {
        HealthRecord memory record = records[recordId];
        require(
            msg.sender == record.patient || authorizedOracles[msg.sender],
            "Not authorized"
        );
        return record;
    }
    
    /**
     * @notice Check if record is active
     * @param recordId The record ID
     * @return Boolean indicating if record is active
     */
    function isRecordActive(uint256 recordId) 
        external 
        view 
        returns (bool) 
    {
        return records[recordId].isActive;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Authorize a research oracle to query data
     * @param oracle Address of the oracle contract
     */
    function authorizeOracle(address oracle) external onlyOwner {
        require(oracle != address(0), "Invalid oracle address");
        authorizedOracles[oracle] = true;
        emit OracleAuthorized(oracle);
    }
    
    /**
     * @notice Revoke oracle authorization
     * @param oracle Address of the oracle contract
     */
    function revokeOracle(address oracle) external onlyOwner {
        authorizedOracles[oracle] = false;
        emit OracleRevoked(oracle);
    }
    
    /**
     * @notice Grant oracle permission to access specific record's encrypted data
     * @param recordId The record ID
     * @param oracle The oracle address
     */
    function grantOracleAccess(uint256 recordId, address oracle) 
        external 
        onlyAuthorizedOracle 
    {
        HealthRecord storage record = records[recordId];
        require(record.isActive, "Record not active");
        
        // Grant oracle access to encrypted fields
        TFHE.allow(record.age, oracle);
        TFHE.allow(record.diagnosis, oracle);
        TFHE.allow(record.treatmentOutcome, oracle);
        TFHE.allow(record.biomarker, oracle);
    }
    
    /**
     * @notice Batch grant access for multiple records
     * @param recordIds Array of record IDs
     * @param oracle The oracle address
     * @dev Includes max batch size check to prevent DoS attacks
     */
    function batchGrantOracleAccess(
        uint256[] calldata recordIds, 
        address oracle
    ) external onlyAuthorizedOracle {
        require(recordIds.length > 0, "No records provided");
        require(recordIds.length <= MAX_BATCH_SIZE, "Batch size exceeds limit");
        
        for (uint256 i = 0; i < recordIds.length; i++) {
            HealthRecord storage record = records[recordIds[i]];
            if (record.isActive) {
                TFHE.allow(record.age, oracle);
                TFHE.allow(record.diagnosis, oracle);
                TFHE.allow(record.treatmentOutcome, oracle);
                TFHE.allow(record.biomarker, oracle);
            }
        }
        
        emit BatchAccessGranted(recordIds, oracle, recordIds.length);
    }
    
    // ============ Fallback Functions ============
    
    /**
     * @notice Fallback function to handle unexpected ETH transfers
     * @dev Allows contract to receive ETH without explicit function calls
     */
    receive() external payable {
        // Silently accept ETH transfers
    }}
