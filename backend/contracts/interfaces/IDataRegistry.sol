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
        euint32 age;
        euint32 diagnosis;
        euint32 treatmentOutcome;
        euint64 biomarker;
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
        externalEuint32 encryptedDiagnosis,
        externalEuint32 encryptedOutcome,
        externalEuint64 encryptedBiomarker,
        bytes calldata inputProof
    ) external returns (uint256);
    
    function revokeRecord(uint256 recordId) external;
    
    function getPatientRecords(address patient) external view returns (uint256[] memory);
    
    function recordCount() external view returns (uint256);
    
    function authorizedOracles(address oracle) external view returns (bool);
    
    function owner() external view returns (address);
    
    function records(uint256 recordId) external view returns (
        euint32 age,
        euint32 diagnosis,
        euint32 treatmentOutcome,
        euint64 biomarker,
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