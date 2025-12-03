// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";
import "./interfaces/IDataRegistry.sol";
import "./interfaces/IPaymentProcessor.sol";

/**
 * @title ResearchOracle
 * @notice Execute encrypted statistical queries on patient data
 * @dev Performs FHE operations without decrypting raw patient data
 */
contract ResearchOracle is SepoliaZamaFHEVMConfig, GatewayCaller {
    
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
    }
    
    /// @notice Mapping: queryId => QueryResult
    mapping(uint256 => QueryResult) public queryResults;
    
    /// @notice Mapping: researcher => queryIds
    mapping(address => uint256[]) public researcherQueries;
    
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
        
        // Initialize accumulators
        euint64 sum = TFHE.asEuint64(0);
        euint32 count = TFHE.asEuint32(0);
        
        uint256 totalRecords = dataRegistry.recordCount();
        uint256 endIndex = startIndex + batchSize;
        if (endIndex > totalRecords) {
            endIndex = totalRecords;
        }
        
        uint256[] memory usedRecords = new uint256[](batchSize);
        uint256 usedCount = 0;
        
        // Iterate through records in range
        for (uint256 i = startIndex; i < endIndex; i++) {
            (
                euint32 age,
                euint32 diagnosis,
                ,
                euint64 biomarker,
                ,
                ,
                bool isActive
            ) = dataRegistry.records(i);
            
            // Skip inactive records
            if (!isActive) continue;
            
            // Encrypted comparison: check if age is in range
            ebool ageInRange = TFHE.and(
                TFHE.ge(age, TFHE.asEuint32(minAge)),
                TFHE.le(age, TFHE.asEuint32(maxAge))
            );
            
            // Encrypted comparison: check if diagnosis matches
            ebool diagnosisMatches = TFHE.eq(diagnosis, TFHE.asEuint32(diagnosisCode));
            
            // Combined condition
            ebool includeRecord = TFHE.and(ageInRange, diagnosisMatches);
            
            // Conditional addition to sum
            euint64 valueToAdd = TFHE.select(
                includeRecord,
                biomarker,
                TFHE.asEuint64(0)
            );
            sum = TFHE.add(sum, valueToAdd);
            
            // Conditional count increment
            euint32 countToAdd = TFHE.select(
                includeRecord,
                TFHE.asEuint32(1),
                TFHE.asEuint32(0)
            );
            count = TFHE.add(count, countToAdd);
            
            // Track used records for payment distribution
            usedRecords[usedCount] = i;
            usedCount++;
        }
        
        // Create query result
        uint256 queryId = queryCount++;
        
        queryResults[queryId] = QueryResult({
            queryId: queryId,
            researcher: msg.sender,
            recordCount: usedCount,
            encryptedSum: sum,
            encryptedCount: count,
            timestamp: block.timestamp,
            isDecrypted: false
        });
        
        // Allow researcher to decrypt results
        TFHE.allow(sum, msg.sender);
        TFHE.allow(count, msg.sender);
        
        // Track researcher's queries
        researcherQueries[msg.sender].push(queryId);
        
        // Distribute payment to patients
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
        
        euint32 count = TFHE.asEuint32(0);
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
                euint32 diagnosis,
                euint32 outcome,
                ,
                ,
                ,
                bool isActive
            ) = dataRegistry.records(i);
            
            if (!isActive) continue;
            
            // Check conditions
            ebool diagnosisMatches = TFHE.eq(
                diagnosis, 
                TFHE.asEuint32(diagnosisCode)
            );
            ebool outcomeQualifies = TFHE.ge(
                outcome, 
                TFHE.asEuint32(minOutcome)
            );
            ebool includeRecord = TFHE.and(diagnosisMatches, outcomeQualifies);
            
            // Increment count
            euint32 increment = TFHE.select(
                includeRecord,
                TFHE.asEuint32(1),
                TFHE.asEuint32(0)
            );
            count = TFHE.add(count, increment);
            
            usedRecords[usedCount] = i;
            usedCount++;
        }
        
        // Store result
        uint256 queryId = queryCount++;
        
        queryResults[queryId] = QueryResult({
            queryId: queryId,
            researcher: msg.sender,
            recordCount: usedCount,
            encryptedSum: TFHE.asEuint64(0),
            encryptedCount: count,
            timestamp: block.timestamp,
            isDecrypted: false
        });
        
        TFHE.allow(count, msg.sender);
        researcherQueries[msg.sender].push(queryId);
        
        // Distribute payment
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
}