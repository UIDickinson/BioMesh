// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";
import "encrypted-types/EncryptedTypes.sol";
import "./interfaces/IDataRegistry.sol";
import "./interfaces/IPaymentProcessor.sol";

contract ResearchOracle is ZamaEthereumConfig {
    
    // ============ State Variables ============
    
    IDataRegistry public dataRegistry;
    IPaymentProcessor public paymentProcessor;
    
    /// @notice Query pricing in wei
    uint256 public queryFee;
    
    /// @notice Owner address
    address public owner;
    
    /// @notice Query counter
    uint256 public queryCount;
    
    /// @notice Query result storage
    struct QueryResult {
        uint256 queryId;
        address researcher;
        uint256 recordCount;
        euint64 encryptedSum;
        euint32 encryptedCount;
        uint256 timestamp;
        bool isDecrypted;
        uint64 decryptedSum;      // Plaintext result after decryption
        uint32 decryptedCount;    // Plaintext count after decryption
    }
    
    /// @notice Mapping: queryId => QueryResult
    mapping(uint256 => QueryResult) public queryResults;
    
    /// @notice Mapping: researcher => queryIds
    mapping(address => uint256[]) public researcherQueries;
    
    /// @notice Mapping: queryId => decryption requested
    mapping(uint256 => bool) public decryptionRequested;
    
    // ============ Events ============
    
    event QueryExecuted(
        uint256 indexed queryId,
        address indexed researcher,
        uint256 indexed timestamp,
        uint256 recordCount,
        uint256 fee
    );
    
    event QueryFeeUpdated(uint256 indexed oldFee, uint256 indexed newFee);
    
    event DecryptionRequested(
        uint256 indexed queryId,
        address indexed researcher
    );
    
    event DecryptionCompleted(
        uint256 indexed queryId,
        address indexed researcher,
        uint64 decryptedSum,
        uint32 decryptedCount
    );
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier validPayment() {
        require(msg.value >= queryFee, "Insufficient payment");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _dataRegistry,
        address _paymentProcessor,
        uint256 _queryFee
    ) {
        require(_dataRegistry != address(0), "Invalid registry");
        require(_paymentProcessor != address(0), "Invalid processor");
        require(_queryFee > 0, "Query fee must be greater than zero");
        
        dataRegistry = IDataRegistry(_dataRegistry);
        paymentProcessor = IPaymentProcessor(_paymentProcessor);
        queryFee = _queryFee;
        owner = msg.sender;
    }
    
    // ============ Core Query Functions ============
    
    /// @notice Maximum records per query batch to prevent gas limit issues
    uint256 public constant MAX_QUERY_BATCH = 50;
    
    /**
     * @notice Compute average biomarker for patients matching criteria
     * @param minAge Minimum age (plaintext for simplicity)
     * @param maxAge Maximum age
     * @param diagnosisCode Target diagnosis code
     * @return queryId The ID of the query for result retrieval
     * @dev For large datasets, use computeAverageBiomarkerPaginated
     */
    function computeAverageBiomarker(
        uint32 minAge,
        uint32 maxAge,
        uint32 diagnosisCode
    ) external payable validPayment returns (uint256) {
        return _computeAverageBiomarkerRange(minAge, maxAge, diagnosisCode, 0, MAX_QUERY_BATCH);
    }
    
    /**
     * @notice Compute average biomarker with pagination for large datasets
     * @param minAge Minimum age
     * @param maxAge Maximum age
     * @param diagnosisCode Target diagnosis code
     * @param startIndex Starting record index
     * @param batchSize Number of records to process (max MAX_QUERY_BATCH)
     * @return queryId The ID of the query for result retrieval
     */
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
    
    /**
     * @notice Internal function to compute average biomarker over a range
     */
    function _computeAverageBiomarkerRange(
        uint32 minAge,
        uint32 maxAge,
        uint32 diagnosisCode,
        uint256 startIndex,
        uint256 batchSize
    ) internal returns (uint256) {
        
        euint64 sum = FHE.asEuint64(0);
        euint32 count = FHE.asEuint32(0);
        
        uint256 totalRecords = dataRegistry.recordCount();
        uint256 endIndex = startIndex + batchSize;
        if (endIndex > totalRecords) {
            endIndex = totalRecords;
        }
        
        uint256[] memory usedRecords = new uint256[](batchSize);
        uint256 usedCount = 0;
        
        for (uint256 i = startIndex; i < endIndex; i++) {
            // First, grant this oracle access to the record's encrypted data
            // This is required for FHE - we need permission to read the handles
            try dataRegistry.grantOracleAccess(i, address(this)) {} catch {}
            
            (
                euint32 age,
                euint32 diagnosis,
                ,
                euint64 biomarker,
                ,
                ,
                bool isActive
            ) = dataRegistry.records(i);
            
            if (!isActive) continue;
            
            ebool ageInRange = FHE.and(
                FHE.ge(age, FHE.asEuint32(minAge)),
                FHE.le(age, FHE.asEuint32(maxAge))
            );
            
            ebool diagnosisMatches = FHE.eq(diagnosis, FHE.asEuint32(diagnosisCode));
            
            ebool includeRecord = FHE.and(ageInRange, diagnosisMatches);
            
            euint64 valueToAdd = FHE.select(
                includeRecord,
                biomarker,
                FHE.asEuint64(0)
            );
            sum = FHE.add(sum, valueToAdd);
            
            euint32 countToAdd = FHE.select(
                includeRecord,
                FHE.asEuint32(1),
                FHE.asEuint32(0)
            );
            count = FHE.add(count, countToAdd);
            
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
        
        FHE.allow(sum, msg.sender);
        FHE.allow(count, msg.sender);
        
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
    
    /**
     * @notice Count patients matching specific criteria
     * @param diagnosisCode Target diagnosis code
     * @param minOutcome Minimum treatment outcome score
     * @return queryId The ID of the query
     * @dev For large datasets, use countPatientsByCriteriaPaginated
     */
    function countPatientsByCriteria(
        uint32 diagnosisCode,
        uint32 minOutcome
    ) external payable validPayment returns (uint256) {
        return _countPatientsByCriteriaRange(diagnosisCode, minOutcome, 0, MAX_QUERY_BATCH);
    }
    
    /**
     * @notice Count patients with pagination for large datasets
     * @param diagnosisCode Target diagnosis code
     * @param minOutcome Minimum treatment outcome score
     * @param startIndex Starting record index
     * @param batchSize Number of records to process (max MAX_QUERY_BATCH)
     * @return queryId The ID of the query
     */
    function countPatientsByCriteriaPaginated(
        uint32 diagnosisCode,
        uint32 minOutcome,
        uint256 startIndex,
        uint256 batchSize
    ) external payable validPayment returns (uint256) {
        require(batchSize <= MAX_QUERY_BATCH, "Batch size exceeds limit");
        return _countPatientsByCriteriaRange(diagnosisCode, minOutcome, startIndex, batchSize);
    }
    
    /**
     * @notice Internal function to count patients over a range
     */
    function _countPatientsByCriteriaRange(
        uint32 diagnosisCode,
        uint32 minOutcome,
        uint256 startIndex,
        uint256 batchSize
    ) internal returns (uint256) {
        
        euint32 count = FHE.asEuint32(0);
        uint256 totalRecords = dataRegistry.recordCount();
        uint256 endIndex = startIndex + batchSize;
        if (endIndex > totalRecords) {
            endIndex = totalRecords;
        }
        
        uint256[] memory usedRecords = new uint256[](batchSize);
        uint256 usedCount = 0;
        
        for (uint256 i = startIndex; i < endIndex; i++) {
            // First, grant this oracle access to the record's encrypted data
            // This is required for FHE - we need permission to read the handles
            try dataRegistry.grantOracleAccess(i, address(this)) {} catch {}
            
            (
                ,
                euint32 diagnosis,
                euint32 outcome,
                ,
                ,
                ,
                bool isActive
            ) = dataRegistry.records(i);
            
            if (!isActive) continue;
            
            ebool diagnosisMatches = FHE.eq(
                diagnosis, 
                FHE.asEuint32(diagnosisCode)
            );
            ebool outcomeQualifies = FHE.ge(
                outcome, 
                FHE.asEuint32(minOutcome)
            );
            ebool includeRecord = FHE.and(diagnosisMatches, outcomeQualifies);
            
            euint32 increment = FHE.select(
                includeRecord,
                FHE.asEuint32(1),
                FHE.asEuint32(0)
            );
            count = FHE.add(count, increment);
            
            usedRecords[usedCount] = i;
            usedCount++;
        }
        
        uint256 queryId = queryCount++;
        
        queryResults[queryId] = QueryResult({
            queryId: queryId,
            researcher: msg.sender,
            recordCount: usedCount,
            encryptedSum: FHE.asEuint64(0),
            encryptedCount: count,
            timestamp: block.timestamp,
            isDecrypted: false,
            decryptedSum: 0,
            decryptedCount: 0
        });
        
        FHE.allow(count, msg.sender);
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
    
    /**
     * @notice Get query result (encrypted)
     * @param queryId The query ID
     * @return QueryResult struct
     */
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
    
    /**
     * @notice Get all query IDs for a researcher
     * @param researcher The researcher address
     * @return Array of query IDs
     */
    function getResearcherQueries(address researcher) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return researcherQueries[researcher];
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update query fee
     * @param newFee New fee in wei
     */
    function updateQueryFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = queryFee;
        queryFee = newFee;
        emit QueryFeeUpdated(oldFee, newFee);
    }
    
    /**
     * @notice Withdraw accumulated fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Transfer failed");
    }
    
    // ============ Utility Functions ============
    
    /**
     * @notice Get total number of queries executed
     * @return Total query count
     */
    function getTotalQueries() external view returns (uint256) {
        return queryCount;
    }
    
    // ============ Decryption Functions ============
    
    /**
     * @notice Request decryption of query results
     * @param queryId The query ID to decrypt
     * @dev Marks the encrypted values as publicly decryptable
     *      The actual decryption happens off-chain via the Gateway
     */
    function requestDecryption(uint256 queryId) external {
        QueryResult storage result = queryResults[queryId];
        require(result.researcher == msg.sender, "Not your query");
        require(!result.isDecrypted, "Already decrypted");
        require(!decryptionRequested[queryId], "Decryption already requested");
        
        // Mark values as publicly decryptable
        // This allows the Gateway to decrypt them
        FHE.makePubliclyDecryptable(result.encryptedSum);
        FHE.makePubliclyDecryptable(result.encryptedCount);
        
        decryptionRequested[queryId] = true;
        
        emit DecryptionRequested(queryId, msg.sender);
    }
    
    /**
     * @notice Check if decryption has been requested for a query
     * @param queryId The query ID to check
     * @return Whether decryption has been requested
     */
    function isDecryptionRequested(uint256 queryId) external view returns (bool) {
        return decryptionRequested[queryId];
    }
    
    /**
     * @notice Submit decrypted results (called after off-chain decryption)
     * @param queryId The query ID
     * @param decryptedSum The decrypted sum value
     * @param decryptedCount The decrypted count value
     * @param decryptionProof The KMS decryption proof
     * @dev In production, this should verify the decryption proof
     */
    function submitDecryptedResult(
        uint256 queryId,
        uint64 decryptedSum,
        uint32 decryptedCount,
        bytes calldata decryptionProof
    ) external {
        QueryResult storage result = queryResults[queryId];
        require(result.researcher == msg.sender, "Not your query");
        require(decryptionRequested[queryId], "Decryption not requested");
        require(!result.isDecrypted, "Already decrypted");
        
        // In production, verify the decryption proof here
        // For now, we trust the caller (the researcher who owns the query)
        // TODO: Add FHE.verifyDecryption() when available
        
        // Store decrypted values
        result.decryptedSum = decryptedSum;
        result.decryptedCount = decryptedCount;
        result.isDecrypted = true;
        
        emit DecryptionCompleted(queryId, msg.sender, decryptedSum, decryptedCount);
    }
    
    /**
     * @notice Get decrypted query result
     * @param queryId The query ID
     * @return sum The decrypted sum (0 if not decrypted)
     * @return count The decrypted count (0 if not decrypted)
     * @return average The computed average (sum/count, 0 if count is 0)
     * @return isReady Whether the result is decrypted and ready
     */
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