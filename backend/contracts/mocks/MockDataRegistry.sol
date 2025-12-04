// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

contract MockDataRegistry {
    
    struct HealthRecord {
        uint256 age;
        uint256 diagnosis;
        uint256 treatmentOutcome;
        uint256 biomarker;
        address patient;
        uint256 timestamp;
        bool isActive;
    }
    
    mapping(uint256 => HealthRecord) public records;
    mapping(address => uint256[]) private patientRecordIds;
    mapping(uint32 => uint256[]) private diagnosisIndex;
    
    uint256 public recordCount;
    mapping(address => bool) public authorizedOracles;
    address public owner;
    uint256 public constant MAX_BATCH_SIZE = 100;
    mapping(address => uint256) public lastSubmission;
    uint256 public submissionCooldown = 1 hours;
    
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
    
    constructor() {
        owner = msg.sender;
    }
    
    function submitHealthData(
        bytes32 encryptedAge,
        bytes32 encryptedDiagnosis,
        bytes32 encryptedOutcome,
        bytes32 encryptedBiomarker,
        bytes calldata
    ) external returns (uint256) {
        
        require(
            block.timestamp >= lastSubmission[msg.sender] + submissionCooldown,
            "Submission cooldown active. Please wait before submitting again."
        );
        lastSubmission[msg.sender] = block.timestamp;
        
        uint256 recordId = recordCount++;
        
        records[recordId] = HealthRecord({
            age: uint256(encryptedAge),
            diagnosis: uint256(encryptedDiagnosis),
            treatmentOutcome: uint256(encryptedOutcome),
            biomarker: uint256(encryptedBiomarker),
            patient: msg.sender,
            timestamp: block.timestamp,
            isActive: true
        });
        
        patientRecordIds[msg.sender].push(recordId);
        
        emit RecordSubmitted(recordId, msg.sender, block.timestamp);
        
        return recordId;
    }
    
    function revokeRecord(uint256 recordId) 
        external 
        onlyRecordOwner(recordId) 
    {
        require(records[recordId].isActive, "Record already revoked");
        records[recordId].isActive = false;
        emit RecordRevoked(recordId, msg.sender);
    }
    
    function getPatientRecords(address patient) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return patientRecordIds[patient];
    }
    
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
    
    function isRecordActive(uint256 recordId) 
        external 
        view 
        returns (bool) 
    {
        return records[recordId].isActive;
    }
    
    function authorizeOracle(address oracle) external onlyOwner {
        require(oracle != address(0), "Invalid oracle address");
        authorizedOracles[oracle] = true;
        emit OracleAuthorized(oracle);
    }
    
    function revokeOracle(address oracle) external onlyOwner {
        authorizedOracles[oracle] = false;
        emit OracleRevoked(oracle);
    }
    
    function updateSubmissionCooldown(uint256 newCooldown) external onlyOwner {
        submissionCooldown = newCooldown;
    }
    
    function grantOracleAccess(uint256 recordId, address) 
        external 
        onlyAuthorizedOracle 
    {
        HealthRecord storage record = records[recordId];
        require(record.isActive, "Record not active");
        emit AccessGranted(recordId, msg.sender);
    }
    
    function batchGrantOracleAccess(
        uint256[] calldata recordIds, 
        address oracle
    ) external onlyAuthorizedOracle {
        require(recordIds.length > 0, "No records provided");
        require(recordIds.length <= MAX_BATCH_SIZE, "Batch size exceeds limit");
        emit BatchAccessGranted(recordIds, oracle, recordIds.length);
    }
    
    receive() external payable {}
}
