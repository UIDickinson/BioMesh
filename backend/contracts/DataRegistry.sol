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
    
    /// @notice Sentinel values for null/not-provided fields
    /// @dev FHE doesn't support nullable types, so we use max values as "null"
    uint32 public constant NULL_UINT32 = type(uint32).max;
    uint16 public constant NULL_UINT16 = type(uint16).max;
    uint8 public constant NULL_UINT8 = type(uint8).max;
    
    /// @notice Gender codes
    uint8 public constant GENDER_MALE = 0;
    uint8 public constant GENDER_FEMALE = 1;
    uint8 public constant GENDER_OTHER = 2;
    
    /// @notice NIH Ethnicity categories
    uint8 public constant ETHNICITY_AMERICAN_INDIAN = 1;
    uint8 public constant ETHNICITY_ASIAN = 2;
    uint8 public constant ETHNICITY_BLACK = 3;
    uint8 public constant ETHNICITY_HISPANIC = 4;
    uint8 public constant ETHNICITY_PACIFIC_ISLANDER = 5;
    uint8 public constant ETHNICITY_WHITE = 6;
    uint8 public constant ETHNICITY_MULTIRACIAL = 7;
    
    /// @notice Minimum k-anonymity threshold for individual record access
    /// @dev Start with k=1 for initial deployment, increase as user base grows
    uint256 public constant K_ANONYMITY_THRESHOLD = 1;
    
    struct HealthRecord {
        // Core demographics
        euint32 age;              // 0-120, NULL_UINT32 = not provided
        euint8 gender;            // 0=Male, 1=Female, 2=Other, NULL_UINT8 = not provided
        euint8 ethnicity;         // NIH categories: 1-7, NULL_UINT8 = not provided
        
        // Clinical data
        euint32 diagnosis;        // ICD-10 category code
        euint32 treatmentOutcome; // 0-100 scale, NULL_UINT32 = not provided
        euint64 biomarker;        // Primary biomarker value
        
        // Vitals (optional)
        euint16 bmi;              // Stored as x10 (e.g., 245 = 24.5), NULL_UINT16 = not provided
        euint16 systolicBP;       // mmHg, NULL_UINT16 = not provided  
        euint16 diastolicBP;      // mmHg, NULL_UINT16 = not provided
        
        // Metadata
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
     * @notice Submit encrypted health data with expanded fields
     * @dev Uses sentinel values (NULL_*) for optional fields not provided
     * @param encryptedAge Encrypted age (1-120) or NULL_UINT32
     * @param encryptedGender Encrypted gender (0-2) or NULL_UINT8
     * @param encryptedEthnicity Encrypted ethnicity (1-7) or NULL_UINT8
     * @param encryptedDiagnosis Encrypted diagnosis code (required)
     * @param encryptedOutcome Encrypted treatment outcome (0-100) or NULL_UINT32
     * @param encryptedBiomarker Encrypted biomarker value (required)
     * @param encryptedBMI Encrypted BMI x10 (e.g., 245=24.5) or NULL_UINT16
     * @param encryptedSystolicBP Encrypted systolic BP (mmHg) or NULL_UINT16
     * @param encryptedDiastolicBP Encrypted diastolic BP (mmHg) or NULL_UINT16
     * @param inputProof Proof for all encrypted inputs
     * @return recordId The ID of the newly created record
     */
    function submitHealthData(
        externalEuint32 encryptedAge,
        externalEuint8 encryptedGender,
        externalEuint8 encryptedEthnicity,
        externalEuint32 encryptedDiagnosis,
        externalEuint32 encryptedOutcome,
        externalEuint64 encryptedBiomarker,
        externalEuint16 encryptedBMI,
        externalEuint16 encryptedSystolicBP,
        externalEuint16 encryptedDiastolicBP,
        bytes calldata inputProof
    ) external returns (uint256) {
        
        require(
            block.timestamp >= lastSubmission[msg.sender] + submissionCooldown,
            "Submission cooldown active. Please wait before submitting again."
        );
        lastSubmission[msg.sender] = block.timestamp;
        
        // Decrypt inputs from external format
        euint32 age = FHE.fromExternal(encryptedAge, inputProof);
        euint8 gender = FHE.fromExternal(encryptedGender, inputProof);
        euint8 ethnicity = FHE.fromExternal(encryptedEthnicity, inputProof);
        euint32 diagnosis = FHE.fromExternal(encryptedDiagnosis, inputProof);
        euint32 outcome = FHE.fromExternal(encryptedOutcome, inputProof);
        euint64 biomarker = FHE.fromExternal(encryptedBiomarker, inputProof);
        euint16 bmi = FHE.fromExternal(encryptedBMI, inputProof);
        euint16 systolicBP = FHE.fromExternal(encryptedSystolicBP, inputProof);
        euint16 diastolicBP = FHE.fromExternal(encryptedDiastolicBP, inputProof);
        
        // Validation: age must be 1-120 OR null sentinel
        // (age >= 1 AND age <= 120) OR (age == NULL_UINT32)
        ebool ageInRange = FHE.and(
            FHE.ge(age, FHE.asEuint32(1)),
            FHE.le(age, FHE.asEuint32(120))
        );
        ebool ageIsNull = FHE.eq(age, FHE.asEuint32(NULL_UINT32));
        FHE.or(ageInRange, ageIsNull); // Valid if in range or null
        
        // Validation: gender must be 0-2 OR null sentinel
        ebool genderInRange = FHE.le(gender, FHE.asEuint8(2));
        ebool genderIsNull = FHE.eq(gender, FHE.asEuint8(NULL_UINT8));
        FHE.or(genderInRange, genderIsNull);
        
        // Validation: ethnicity must be 1-7 OR null sentinel
        ebool ethnicityInRange = FHE.and(
            FHE.ge(ethnicity, FHE.asEuint8(1)),
            FHE.le(ethnicity, FHE.asEuint8(7))
        );
        ebool ethnicityIsNull = FHE.eq(ethnicity, FHE.asEuint8(NULL_UINT8));
        FHE.or(ethnicityInRange, ethnicityIsNull);
        
        // Validation: outcome must be 0-100 OR null sentinel
        ebool outcomeInRange = FHE.le(outcome, FHE.asEuint32(100));
        ebool outcomeIsNull = FHE.eq(outcome, FHE.asEuint32(NULL_UINT32));
        FHE.or(outcomeInRange, outcomeIsNull);
        
        uint256 recordId = recordCount++;
        
        records[recordId] = HealthRecord({
            age: age,
            gender: gender,
            ethnicity: ethnicity,
            diagnosis: diagnosis,
            treatmentOutcome: outcome,
            biomarker: biomarker,
            bmi: bmi,
            systolicBP: systolicBP,
            diastolicBP: diastolicBP,
            patient: msg.sender,
            timestamp: block.timestamp,
            isActive: true
        });
        
        // Allow contract to access all fields
        FHE.allowThis(age);
        FHE.allowThis(gender);
        FHE.allowThis(ethnicity);
        FHE.allowThis(diagnosis);
        FHE.allowThis(outcome);
        FHE.allowThis(biomarker);
        FHE.allowThis(bmi);
        FHE.allowThis(systolicBP);
        FHE.allowThis(diastolicBP);
        
        // Allow patient to access their own data
        FHE.allow(age, msg.sender);
        FHE.allow(gender, msg.sender);
        FHE.allow(ethnicity, msg.sender);
        FHE.allow(diagnosis, msg.sender);
        FHE.allow(outcome, msg.sender);
        FHE.allow(biomarker, msg.sender);
        FHE.allow(bmi, msg.sender);
        FHE.allow(systolicBP, msg.sender);
        FHE.allow(diastolicBP, msg.sender);
        
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
        
        // Grant access to all encrypted fields
        FHE.allow(record.age, oracle);
        FHE.allow(record.gender, oracle);
        FHE.allow(record.ethnicity, oracle);
        FHE.allow(record.diagnosis, oracle);
        FHE.allow(record.treatmentOutcome, oracle);
        FHE.allow(record.biomarker, oracle);
        FHE.allow(record.bmi, oracle);
        FHE.allow(record.systolicBP, oracle);
        FHE.allow(record.diastolicBP, oracle);
        
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
                // Grant access to all encrypted fields
                FHE.allow(record.age, oracle);
                FHE.allow(record.gender, oracle);
                FHE.allow(record.ethnicity, oracle);
                FHE.allow(record.diagnosis, oracle);
                FHE.allow(record.treatmentOutcome, oracle);
                FHE.allow(record.biomarker, oracle);
                FHE.allow(record.bmi, oracle);
                FHE.allow(record.systolicBP, oracle);
                FHE.allow(record.diastolicBP, oracle);
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