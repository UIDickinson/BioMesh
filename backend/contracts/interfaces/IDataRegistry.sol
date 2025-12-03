// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";


interface IDataRegistry {
    
    
    struct HealthRecord {
        euint32 age;              // Encrypted age
        euint32 diagnosis;        // Encrypted diagnosis code
        euint32 treatmentOutcome; // Encrypted outcome score (0-100)
        euint64 biomarker;        // Encrypted lab value
        address patient;          // Patient wallet address
        uint256 timestamp;        // Submission timestamp
        bool isActive;            // Record active status
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
    
    
    
    function getRecord(uint256 recordId) external view returns (HealthRecord memory);
    
    
    function isRecordActive(uint256 recordId) external view returns (bool);
    
    
    function authorizeOracle(address oracle) external;
    
    
    function revokeOracle(address oracle) external;
    
    
    function grantOracleAccess(uint256 recordId, address oracle) external;
    
    
    function batchGrantOracleAccess(uint256[] calldata recordIds, address oracle) external;
    
    
    function submitHealthData(
        einput encryptedAge,
        einput encryptedDiagnosis,
        einput encryptedOutcome,
        einput encryptedBiomarker,
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
}