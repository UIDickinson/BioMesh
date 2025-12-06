// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";
import "encrypted-types/EncryptedTypes.sol";

contract DataRegistry is ZamaEthereumConfig {
    
    // ============ Enums ============
    
    /// @notice Consent levels for data sharing
    enum ConsentLevel {
        AggregateOnly,      // 0: Only aggregate statistics allowed
        IndividualAllowed   // 1: Individual anonymized records can be shared
    }
    
    // ============ Constants ============
    
    /// @notice Minimum k-anonymity threshold for individual record access
    /// @dev Start with k=1 for initial deployment, increase as user base grows
    uint256 public constant K_ANONYMITY_THRESHOLD = 1;
    
    struct HealthRecord {
        euint32 age;
        euint32 diagnosis;
        euint32 treatmentOutcome;
        euint64 biomarker;
        address patient;
        uint256 timestamp;
        bool isActive;
    }
    
    mapping(uint256 => HealthRecord) public records;
    
    /// @notice Consent level per record (stored separately to avoid struct changes)
    mapping(uint256 => ConsentLevel) public recordConsent;
    
    mapping(address => uint256[]) private patientRecordIds;
    
    mapping(uint32 => uint256[]) private diagnosisIndex;
    
    uint256 public recordCount;
    
    mapping(address => bool) public authorizedOracles;
    
    address public owner;
    
    uint256 public constant MAX_BATCH_SIZE = 100;
    
    /// @notice Submission cooldown per address (rate limiting)
    mapping(address => uint256) public lastSubmission;
    
    /// @notice Cooldown period between submissions (1 hour)
    uint256 public submissionCooldown = 1 hours;
    
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
    event ConsentUpdated(uint256 indexed recordId, ConsentLevel newLevel);
    
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
     * @param encryptedAge Encrypted age value
     * @param encryptedDiagnosis Encrypted diagnosis code
     * @param encryptedOutcome Encrypted treatment outcome
     * @param encryptedBiomarker Encrypted biomarker value
     * @param inputProof Proof for all encrypted inputs
     * @return recordId The ID of the newly created record
     */
    function submitHealthData(
        externalEuint32 encryptedAge,
        externalEuint32 encryptedDiagnosis,
        externalEuint32 encryptedOutcome,
        externalEuint64 encryptedBiomarker,
        bytes calldata inputProof
    ) external returns (uint256) {
        
        require(
            block.timestamp >= lastSubmission[msg.sender] + submissionCooldown,
            "Submission cooldown active. Please wait before submitting again."
        );
        lastSubmission[msg.sender] = block.timestamp;
        
        euint32 age = FHE.fromExternal(encryptedAge, inputProof);
        euint32 diagnosis = FHE.fromExternal(encryptedDiagnosis, inputProof);
        euint32 outcome = FHE.fromExternal(encryptedOutcome, inputProof);
        euint64 biomarker = FHE.fromExternal(encryptedBiomarker, inputProof);
        
        ebool validAge = FHE.and(
            FHE.ge(age, FHE.asEuint32(1)),
            FHE.le(age, FHE.asEuint32(120))
        );
        
        ebool validOutcome = FHE.le(outcome, FHE.asEuint32(100));
        
        FHE.and(validAge, validOutcome);
        
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
        
        FHE.allowThis(age);
        FHE.allowThis(diagnosis);
        FHE.allowThis(outcome);
        FHE.allowThis(biomarker);
        
        FHE.allow(age, msg.sender);
        FHE.allow(diagnosis, msg.sender);
        FHE.allow(outcome, msg.sender);
        FHE.allow(biomarker, msg.sender);
        
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
     * @notice Get patient's record IDs with pagination
     * @param patient The patient's address
     * @param offset Starting index
     * @param limit Maximum number of records to return
     * @return Array of record IDs, total count of patient's records
     */
    function getPatientRecordsPaginated(
        address patient,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory, uint256) {
        uint256[] storage allRecords = patientRecordIds[patient];
        uint256 totalCount = allRecords.length;
        
        if (offset >= totalCount) {
            return (new uint256[](0), totalCount);
        }
        
        uint256 endIndex = offset + limit;
        if (endIndex > totalCount) {
            endIndex = totalCount;
        }
        
        uint256 resultLength = endIndex - offset;
        uint256[] memory result = new uint256[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = allRecords[offset + i];
        }
        
        return (result, totalCount);
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
     * @notice Update submission cooldown period
     * @param newCooldown New cooldown period in seconds
     */
    function updateSubmissionCooldown(uint256 newCooldown) external onlyOwner {
        submissionCooldown = newCooldown;
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
        
        FHE.allow(record.age, oracle);
        FHE.allow(record.diagnosis, oracle);
        FHE.allow(record.treatmentOutcome, oracle);
        FHE.allow(record.biomarker, oracle);
        
        emit AccessGranted(recordId, oracle);
    }
    
    /**
     * @notice Batch grant access for multiple records
     * @param recordIds Array of record IDs
     * @param oracle The oracle address
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
                FHE.allow(record.age, oracle);
                FHE.allow(record.diagnosis, oracle);
                FHE.allow(record.treatmentOutcome, oracle);
                FHE.allow(record.biomarker, oracle);
            }
        }
        
        emit BatchAccessGranted(recordIds, oracle, recordIds.length);
    }
    
    // ============ Consent Management Functions ============
    
    /**
     * @notice Set consent level for a record (called during submission or later)
     * @param recordId The record ID
     * @param consentLevel 0 = aggregate only, 1 = individual allowed
     */
    function setConsent(uint256 recordId, uint8 consentLevel) 
        external 
        onlyRecordOwner(recordId) 
    {
        require(consentLevel <= 1, "Invalid consent level");
        require(records[recordId].isActive, "Record not active");
        
        recordConsent[recordId] = ConsentLevel(consentLevel);
        emit ConsentUpdated(recordId, ConsentLevel(consentLevel));
    }
    
    /**
     * @notice Check if a record allows individual access
     * @param recordId The record ID
     * @return True if individual access is allowed
     */
    function allowsIndividualAccess(uint256 recordId) 
        external 
        view 
        returns (bool) 
    {
        return records[recordId].isActive && 
               recordConsent[recordId] == ConsentLevel.IndividualAllowed;
    }
    
    /**
     * @notice Get consent level for a record
     * @param recordId The record ID
     * @return The consent level
     */
    function getConsentLevel(uint256 recordId) 
        external 
        view 
        returns (ConsentLevel) 
    {
        return recordConsent[recordId];
    }
    
    /**
     * @notice Count records with individual access consent (for k-anonymity check)
     * @param recordIds Array of record IDs to check
     * @return count Number of records allowing individual access
     */
    function countIndividualConsent(uint256[] calldata recordIds) 
        external 
        view 
        returns (uint256 count) 
    {
        for (uint256 i = 0; i < recordIds.length; i++) {
            if (records[recordIds[i]].isActive && 
                recordConsent[recordIds[i]] == ConsentLevel.IndividualAllowed) {
                count++;
            }
        }
        return count;
    }
    
    // ============ Fallback Functions ============
    
    /**
     * @notice Fallback function to handle unexpected ETH transfers
     * @dev Allows contract to receive ETH without explicit function calls
     */
    receive() external payable {
        // Silently accept ETH transfers
    }
}