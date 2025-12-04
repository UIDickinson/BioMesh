// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "./MockDataRegistry.sol";
import "../interfaces/IPaymentProcessor.sol";

contract MockResearchOracle {
    
    MockDataRegistry public dataRegistry;
    IPaymentProcessor public paymentProcessor;
    
    uint256 public queryFee;
    address public owner;
    uint256 public queryCount;
    
    struct QueryResult {
        uint256 queryId;
        address researcher;
        uint256 recordCount;
        uint256 encryptedSum;
        uint256 encryptedCount;
        uint256 timestamp;
        bool isDecrypted;
        uint64 decryptedSum;
        uint32 decryptedCount;
    }
    
    mapping(uint256 => QueryResult) public queryResults;
    mapping(address => uint256[]) public researcherQueries;
    mapping(uint256 => bool) public decryptionRequested;
    
    event QueryExecuted(
        uint256 indexed queryId,
        address indexed researcher,
        uint256 indexed timestamp,
        uint256 recordCount,
        uint256 fee
    );
    
    event QueryFeeUpdated(uint256 indexed oldFee, uint256 indexed newFee);
    
    event DecryptionRequested(uint256 indexed queryId, address indexed researcher);
    
    event DecryptionCompleted(
        uint256 indexed queryId,
        address indexed researcher,
        uint64 decryptedSum,
        uint32 decryptedCount
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier validPayment() {
        require(msg.value >= queryFee, "Insufficient payment");
        _;
    }
    
    uint256 public constant MAX_QUERY_BATCH = 50;
    
    constructor(
        address _dataRegistry,
        address _paymentProcessor,
        uint256 _queryFee
    ) {
        require(_dataRegistry != address(0), "Invalid registry");
        require(_paymentProcessor != address(0), "Invalid processor");
        require(_queryFee > 0, "Query fee must be greater than zero");
        
        dataRegistry = MockDataRegistry(payable(_dataRegistry));
        paymentProcessor = IPaymentProcessor(_paymentProcessor);
        queryFee = _queryFee;
        owner = msg.sender;
    }
    
    function computeAverageBiomarker(
        uint32 minAge,
        uint32 maxAge,
        uint32 diagnosisCode
    ) external payable validPayment returns (uint256) {
        return _computeAverageBiomarkerRange(minAge, maxAge, diagnosisCode, 0, MAX_QUERY_BATCH);
    }
    
    function computeAverageBiomarkerPaginated(
        uint32 minAge,
        uint32 maxAge,
        uint32 diagnosisCode,
        uint256 startIndex,
        uint256 batchSize
    ) external payable validPayment returns (uint256) {
        require(batchSize <= MAX_QUERY_BATCH, "Batch size exceeds limit");
        return _computeAverageBiomarkerRange(minAge, maxAge, diagnosisCode, startIndex, batchSize);
    }
    
    function _computeAverageBiomarkerRange(
        uint32 minAge,
        uint32 maxAge,
        uint32 diagnosisCode,
        uint256 startIndex,
        uint256 batchSize
    ) internal returns (uint256) {
        
        uint256 sum = 0;
        uint256 count = 0;
        
        uint256 totalRecords = dataRegistry.recordCount();
        uint256 endIndex = startIndex + batchSize;
        if (endIndex > totalRecords) {
            endIndex = totalRecords;
        }
        
        uint256[] memory usedRecords = new uint256[](batchSize);
        uint256 usedCount = 0;
        
        for (uint256 i = startIndex; i < endIndex; i++) {
            (
                uint256 age,
                uint256 diagnosis,
                ,
                uint256 biomarker,
                ,
                ,
                bool isActive
            ) = dataRegistry.records(i);
            
            if (!isActive) continue;
            
            bool ageInRange = age >= minAge && age <= maxAge;
            bool diagnosisMatches = diagnosis == diagnosisCode;
            
            if (ageInRange && diagnosisMatches) {
                sum += biomarker;
                count++;
            }
            
            usedRecords[usedCount] = i;
            usedCount++;
        }
        
        uint256 queryId = queryCount++;
        
        queryResults[queryId] = QueryResult({
            queryId: queryId,
            researcher: msg.sender,
            recordCount: usedCount,
            encryptedSum: sum,
            encryptedCount: count,
            timestamp: block.timestamp,
            isDecrypted: false,
            decryptedSum: 0,
            decryptedCount: 0
        });
        
        researcherQueries[msg.sender].push(queryId);
        
        uint256[] memory finalRecords = new uint256[](usedCount);
        for (uint256 i = 0; i < usedCount; i++) {
            finalRecords[i] = usedRecords[i];
        }
        
        paymentProcessor.distributeEarnings{value: msg.value}(
            finalRecords,
            msg.sender
        );
        
        emit QueryExecuted(queryId, msg.sender, block.timestamp, usedCount, msg.value);
        
        return queryId;
    }
    
    function countPatientsByCriteria(
        uint32 diagnosisCode,
        uint32 minOutcome
    ) external payable validPayment returns (uint256) {
        return _countPatientsByCriteriaRange(diagnosisCode, minOutcome, 0, MAX_QUERY_BATCH);
    }
    
    function countPatientsByCriteriaPaginated(
        uint32 diagnosisCode,
        uint32 minOutcome,
        uint256 startIndex,
        uint256 batchSize
    ) external payable validPayment returns (uint256) {
        require(batchSize <= MAX_QUERY_BATCH, "Batch size exceeds limit");
        return _countPatientsByCriteriaRange(diagnosisCode, minOutcome, startIndex, batchSize);
    }
    
    function _countPatientsByCriteriaRange(
        uint32 diagnosisCode,
        uint32 minOutcome,
        uint256 startIndex,
        uint256 batchSize
    ) internal returns (uint256) {
        
        uint256 count = 0;
        uint256 totalRecords = dataRegistry.recordCount();
        uint256 endIndex = startIndex + batchSize;
        if (endIndex > totalRecords) {
            endIndex = totalRecords;
        }
        
        uint256[] memory usedRecords = new uint256[](batchSize);
        uint256 usedCount = 0;
        
        for (uint256 i = startIndex; i < endIndex; i++) {
            (
                ,
                uint256 diagnosis,
                uint256 outcome,
                ,
                ,
                ,
                bool isActive
            ) = dataRegistry.records(i);
            
            if (!isActive) continue;
            
            if (diagnosis == diagnosisCode && outcome >= minOutcome) {
                count++;
            }
            
            usedRecords[usedCount] = i;
            usedCount++;
        }
        
        uint256 queryId = queryCount++;
        
        queryResults[queryId] = QueryResult({
            queryId: queryId,
            researcher: msg.sender,
            recordCount: usedCount,
            encryptedSum: 0,
            encryptedCount: count,
            timestamp: block.timestamp,
            isDecrypted: false,
            decryptedSum: 0,
            decryptedCount: 0
        });
        
        researcherQueries[msg.sender].push(queryId);
        
        uint256[] memory finalRecords = new uint256[](usedCount);
        for (uint256 i = 0; i < usedCount; i++) {
            finalRecords[i] = usedRecords[i];
        }
        
        paymentProcessor.distributeEarnings{value: msg.value}(
            finalRecords,
            msg.sender
        );
        
        emit QueryExecuted(queryId, msg.sender, block.timestamp, usedCount, msg.value);
        
        return queryId;
    }
    
    function getQueryResult(uint256 queryId) 
        external 
        view 
        returns (QueryResult memory) 
    {
        require(
            queryResults[queryId].researcher == msg.sender,
            "Not your query"
        );
        return queryResults[queryId];
    }
    
    function getResearcherQueries(address researcher) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return researcherQueries[researcher];
    }
    
    function updateQueryFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = queryFee;
        queryFee = newFee;
        emit QueryFeeUpdated(oldFee, newFee);
    }
    
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Transfer failed");
    }
    
    function getTotalQueries() external view returns (uint256) {
        return queryCount;
    }
    
    // ============ Decryption Functions (Mock) ============
    
    function requestDecryption(uint256 queryId) external {
        QueryResult storage result = queryResults[queryId];
        require(result.researcher == msg.sender, "Not your query");
        require(!result.isDecrypted, "Already decrypted");
        require(!decryptionRequested[queryId], "Decryption already requested");
        
        decryptionRequested[queryId] = true;
        
        // In mock mode, auto-decrypt immediately using stored values
        result.decryptedSum = uint64(result.encryptedSum);
        result.decryptedCount = uint32(result.encryptedCount);
        result.isDecrypted = true;
        
        emit DecryptionRequested(queryId, msg.sender);
        emit DecryptionCompleted(queryId, msg.sender, result.decryptedSum, result.decryptedCount);
    }
    
    function isDecryptionRequested(uint256 queryId) external view returns (bool) {
        return decryptionRequested[queryId];
    }
    
    function submitDecryptedResult(
        uint256 queryId,
        uint64 decryptedSum,
        uint32 decryptedCount,
        bytes calldata /* decryptionProof */
    ) external {
        QueryResult storage result = queryResults[queryId];
        // Allow researcher OR owner to submit (owner acts as relayer)
        require(
            result.researcher == msg.sender || msg.sender == owner,
            "Not authorized"
        );
        require(decryptionRequested[queryId], "Decryption not requested");
        require(!result.isDecrypted, "Already decrypted");
        
        result.decryptedSum = decryptedSum;
        result.decryptedCount = decryptedCount;
        result.isDecrypted = true;
        
        emit DecryptionCompleted(queryId, msg.sender, decryptedSum, decryptedCount);
    }
    
    function getDecryptedResult(uint256 queryId) 
        external 
        view 
        returns (
            uint64 sum,
            uint32 count,
            uint64 average,
            bool isReady
        ) 
    {
        QueryResult storage result = queryResults[queryId];
        require(result.researcher == msg.sender, "Not your query");
        
        if (!result.isDecrypted) {
            return (0, 0, 0, false);
        }
        
        uint64 avg = result.decryptedCount > 0 
            ? result.decryptedSum / uint64(result.decryptedCount) 
            : 0;
            
        return (
            result.decryptedSum,
            result.decryptedCount,
            avg,
            true
        );
    }
}
