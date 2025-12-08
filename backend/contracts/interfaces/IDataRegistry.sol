// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "encrypted-types/EncryptedTypes.sol";

interface IDataRegistry {
    
    // Consent levels enum
    enum ConsentLevel {
        AggregateOnly,      // 0: Only aggregate statistics allowed
        IndividualAllowed   // 1: Individual anonymized records can be shared
    }
    
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
    
    event RecordSubmitted(
        uint256 indexed recordId, 
        address indexed patient,
        uint256 timestamp
    );
    
    event RecordRevoked(
        uint256 indexed recordId, 
        address indexed patient
    );
    
    event OracleAuthorized(address indexed oracle);
    event OracleRevoked(address indexed oracle);
    event ConsentUpdated(uint256 indexed recordId, ConsentLevel newLevel);
    
    function getRecord(uint256 recordId) external view returns (HealthRecord memory);
    
    function isRecordActive(uint256 recordId) external view returns (bool);
    
    function authorizeOracle(address oracle) external;
    
    function revokeOracle(address oracle) external;
    
    function grantOracleAccess(uint256 recordId, address oracle) external;
    
    function batchGrantOracleAccess(uint256[] calldata recordIds, address oracle) external;
    
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
    ) external returns (uint256);
    
    function revokeRecord(uint256 recordId) external;
    
    function getPatientRecords(address patient) external view returns (uint256[] memory);
    
    function recordCount() external view returns (uint256);
    
    function authorizedOracles(address oracle) external view returns (bool);
    
    function owner() external view returns (address);
    
    function records(uint256 recordId) external view returns (
        euint32 age,
        euint8 gender,
        euint8 ethnicity,
        euint32 diagnosis,
        euint32 treatmentOutcome,
        euint64 biomarker,
        euint16 bmi,
        euint16 systolicBP,
        euint16 diastolicBP,
        address patient,
        uint256 timestamp,
        bool isActive
    );
    
    // New consent functions
    function setConsent(uint256 recordId, uint8 consentLevel) external;
    function allowsIndividualAccess(uint256 recordId) external view returns (bool);
    function getConsentLevel(uint256 recordId) external view returns (ConsentLevel);
    function countIndividualConsent(uint256[] calldata recordIds) external view returns (uint256);
    function K_ANONYMITY_THRESHOLD() external view returns (uint256);
}