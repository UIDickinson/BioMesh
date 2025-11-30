// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";

/**
 * @title IDataRegistry
 * @notice Interface for the DataRegistry contract
 * @dev Defines the structure and functions for patient health data management
 */
interface IDataRegistry {
    
    /**
     * @notice Health record structure
     * @dev All health data is stored as encrypted integers
     */
    struct HealthRecord {
        euint32 age;              // Encrypted age
        euint32 diagnosis;        // Encrypted diagnosis code
        euint32 treatmentOutcome; // Encrypted outcome score (0-100)
        euint64 biomarker;        // Encrypted lab value
        address patient;          // Patient wallet address
        uint256 timestamp;        // Submission timestamp
        bool isActive;            // Record active status
    }
    
    // ============ Events ============
    
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
    
    // ============ Core Functions ============
    
    /**
     * @notice Get record details
     * @param recordId The record ID
     * @return HealthRecord struct
     */
    function getRecord(uint256 recordId) external view returns (HealthRecord memory);
    
    /**
     * @notice Check if record is active
     * @param recordId The record ID
     * @return Boolean indicating if record is active
     */
    function isRecordActive(uint256 recordId) external view returns (bool);
    
    /**
     * @notice Authorize a research oracle to query data
     * @param oracle Address of the oracle contract
     */
    function authorizeOracle(address oracle) external;
    
    /**
     * @notice Revoke oracle authorization
     * @param oracle Address of the oracle contract
     */
    function revokeOracle(address oracle) external;
    
    /**
     * @notice Grant oracle permission to access specific record's encrypted data
     * @param recordId The record ID
     * @param oracle The oracle address
     */
    function grantOracleAccess(uint256 recordId, address oracle) external;
    
    /**
     * @notice Batch grant access for multiple records
     * @param recordIds Array of record IDs
     * @param oracle The oracle address
     */
    function batchGrantOracleAccess(uint256[] calldata recordIds, address oracle) external;
    
    /**
     * @notice Submit encrypted health data
     * @param encryptedAge Encrypted age value with proof
     * @param encryptedDiagnosis Encrypted diagnosis code with proof
     * @param encryptedOutcome Encrypted treatment outcome with proof
     * @param encryptedBiomarker Encrypted biomarker value with proof
     * @param inputProof Proof of encryption for all inputs
     * @return recordId The ID of the newly created record
     */
    function submitHealthData(
        einput encryptedAge,
        einput encryptedDiagnosis,
        einput encryptedOutcome,
        einput encryptedBiomarker,
        bytes calldata inputProof
    ) external returns (uint256);
    
    /**
     * @notice Revoke access to patient's health data
     * @param recordId The ID of the record to revoke
     */
    function revokeRecord(uint256 recordId) external;
    
    /**
     * @notice Get patient's record IDs
     * @param patient The patient's address
     * @return Array of record IDs owned by the patient
     */
    function getPatientRecords(address patient) external view returns (uint256[] memory);
    
    // ============ View Functions ============
    
    /**
     * @notice Get total number of records
     * @return Total record count
     */
    function recordCount() external view returns (uint256);
    
    /**
     * @notice Check if address is authorized oracle
     * @param oracle Address to check
     * @return Boolean indicating authorization status
     */
    function authorizedOracles(address oracle) external view returns (bool);
    
    /**
     * @notice Get contract owner
     * @return Owner address
     */
    function owner() external view returns (address);
    
    /**
     * @notice Get record by ID (returns individual fields for compatibility)
     * @param recordId The record ID
     * @return age Encrypted age
     * @return diagnosis Encrypted diagnosis
     * @return treatmentOutcome Encrypted treatment outcome
     * @return biomarker Encrypted biomarker
     * @return patient Patient address
     * @return timestamp Submission timestamp
     * @return isActive Active status
     */
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