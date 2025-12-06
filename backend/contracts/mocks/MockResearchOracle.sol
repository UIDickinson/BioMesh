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
    
    // ============ Individual Records Query (Enhanced Feature) ============
    
    // Start with k=1 for initial deployment, increase as user base grows
    uint256 public constant K_ANONYMITY_THRESHOLD = 1;
    uint256 public individualQueryFee;
    
    struct AnonymizedRecord {
        bytes32 anonymousId;
        uint256 age;
        uint256 diagnosis;
        uint256 treatmentOutcome;
        uint256 biomarker;
    }
    
    struct IndividualQueryResult {
        uint256 queryId;
        address researcher;
        uint256 matchCount;
        bool kAnonymityMet;
        AnonymizedRecord[] records;
        uint256 timestamp;
    }
    
    mapping(uint256 => IndividualQueryResult) internal individualResults;
    uint256 public individualQueryCount;
    
    event IndividualAccessGranted(
        uint256 indexed queryId,
        address indexed researcher,
        uint256 matchCount,
        bool kAnonymityMet
    );
    
    function setIndividualQueryFee(uint256 _fee) external onlyOwner {
        individualQueryFee = _fee;
    }
    
    function queryIndividualRecords(
        uint32 diagnosisCode,
        uint32 minAge,
        uint32 maxAge,
        uint256 maxResults
    ) external payable returns (uint256) {
        require(msg.value >= individualQueryFee, "Insufficient payment");
        require(maxResults <= 100, "Max 100 results");
        
        uint256 totalRecords = dataRegistry.recordCount();
        
        // First pass: count matching records with individual consent
        uint256 matchCount = 0;
        for (uint256 i = 0; i < totalRecords && i < MAX_QUERY_BATCH; i++) {
            (
                uint256 age,
                uint256 diagnosis,
                ,
                ,
                ,
                ,
                bool isActive
            ) = dataRegistry.records(i);
            
            if (!isActive) continue;
            
            // Check consent
            if (!dataRegistry.allowsIndividualAccess(i)) continue;
            
            // Check criteria
            if (age >= minAge && age <= maxAge && diagnosis == diagnosisCode) {
                matchCount++;
            }
        }
        
        uint256 queryId = individualQueryCount++;
        bool kAnonymityMet = matchCount >= K_ANONYMITY_THRESHOLD;
        
        // Create result storage
        IndividualQueryResult storage result = individualResults[queryId];
        result.queryId = queryId;
        result.researcher = msg.sender;
        result.matchCount = matchCount;
        result.kAnonymityMet = kAnonymityMet;
        result.timestamp = block.timestamp;
        
        // Only populate records if k-anonymity is met
        if (kAnonymityMet) {
            uint256 recordsAdded = 0;
            for (uint256 i = 0; i < totalRecords && recordsAdded < maxResults; i++) {
                (
                    uint256 age,
                    uint256 diagnosis,
                    uint256 outcome,
                    uint256 biomarker,
                    ,
                    ,
                    bool isActive
                ) = dataRegistry.records(i);
                
                if (!isActive) continue;
                if (!dataRegistry.allowsIndividualAccess(i)) continue;
                
                if (age >= minAge && age <= maxAge && diagnosis == diagnosisCode) {
                    // Create anonymized record
                    bytes32 anonId = keccak256(abi.encodePacked(i, block.timestamp, queryId));
                    
                    result.records.push(AnonymizedRecord({
                        anonymousId: anonId,
                        age: age,
                        diagnosis: diagnosis,
                        treatmentOutcome: outcome,
                        biomarker: biomarker
                    }));
                    
                    recordsAdded++;
                }
            }
        }
        
        emit IndividualAccessGranted(queryId, msg.sender, matchCount, kAnonymityMet);
        
        return queryId;
    }
    
    function getIndividualQueryResult(uint256 queryId)
        external
        view
        returns (
            uint256 _queryId,
            address researcher,
            uint256 matchCount,
            bool kAnonymityMet,
            uint256 recordCount,
            uint256 timestamp
        )
    {
        IndividualQueryResult storage result = individualResults[queryId];
        require(result.researcher == msg.sender, "Not your query");
        
        return (
            result.queryId,
            result.researcher,
            result.matchCount,
            result.kAnonymityMet,
            result.records.length,
            result.timestamp
        );
    }
    
    function getIndividualRecord(uint256 queryId, uint256 index)
        external
        view
        returns (AnonymizedRecord memory)
    {
        IndividualQueryResult storage result = individualResults[queryId];
        require(result.researcher == msg.sender, "Not your query");
        require(index < result.records.length, "Index out of bounds");
        
        return result.records[index];
    }
}
