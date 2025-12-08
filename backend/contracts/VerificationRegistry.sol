// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title VerificationRegistry
 * @notice Handles data authenticity verification through multiple mechanisms:
 *         1. AI Document Verification - AI extracts data from uploaded documents
 *         2. Stake/Slashing - Economic disincentive for fraudulent data
 *         3. Provider Attestation - Healthcare provider signatures
 *         4. Reputation System - Trust scores based on data history
 */
contract VerificationRegistry {
    
    // ============ Enums ============
    
    /// @notice Verification status of a record
    enum VerificationStatus {
        Unverified,         // 0: No verification attempted
        Pending,            // 1: Verification in progress
        AIVerified,         // 2: AI document verification passed
        ProviderAttested,   // 3: Healthcare provider attested
        Flagged,            // 4: Flagged as potentially fraudulent
        Slashed             // 5: Confirmed fraudulent, stake slashed
    }
    
    /// @notice Type of verification evidence
    enum EvidenceType {
        None,               // 0: No evidence
        LabReport,          // 1: Laboratory report
        Prescription,       // 2: Prescription document
        MedicalRecord,      // 3: Medical record/chart
        InsuranceClaim,     // 4: Insurance claim document
        ProviderLetter      // 5: Letter from healthcare provider
    }
    
    // ============ Structs ============
    
    /// @notice Verification data for a health record
    struct Verification {
        VerificationStatus status;
        EvidenceType evidenceType;
        bytes32 documentHash;           // Hash of uploaded document
        uint8 aiConfidenceScore;        // 0-100 AI verification confidence
        address attestingProvider;      // Healthcare provider who attested (if any)
        uint256 stakeAmount;            // ETH staked by patient
        uint256 verificationTimestamp;
        string aiExtractionSummary;     // Brief summary of AI extraction (stored off-chain ref)
    }
    
    /// @notice Patient reputation data
    struct Reputation {
        uint256 totalSubmissions;       // Total records submitted
        uint256 verifiedCount;          // Successfully verified records
        uint256 flaggedCount;           // Records flagged as suspicious
        uint256 slashedCount;           // Records confirmed fraudulent
        uint16 reputationScore;         // 0-1000 score (100.0%)
        uint256 lastUpdated;
    }
    
    /// @notice Registered healthcare provider
    struct Provider {
        bool isRegistered;
        string name;
        string licenseNumber;
        uint256 attestationCount;
        uint256 registrationTime;
    }
    
    // ============ Constants ============
    
    /// @notice Minimum stake required for data submission
    uint256 public constant MIN_STAKE = 0.001 ether;
    
    /// @notice Maximum stake (for higher trust bonus)
    uint256 public constant MAX_STAKE = 0.1 ether;
    
    /// @notice Stake multiplier for reputation score (stake * multiplier / 100)
    uint256 public constant STAKE_REPUTATION_BONUS = 10;
    
    /// @notice AI confidence threshold for auto-verification
    uint8 public constant AI_CONFIDENCE_THRESHOLD = 70;
    
    /// @notice Dispute window (7 days)
    uint256 public constant DISPUTE_WINDOW = 7 days;
    
    /// @notice Slash percentage (50% goes to reporter, 50% burned)
    uint256 public constant SLASH_PERCENTAGE = 100; // 100% slashed
    
    /// @notice Starting reputation score for new patients
    uint16 public constant INITIAL_REPUTATION = 500;
    
    // ============ State Variables ============
    
    /// @notice Contract owner
    address public owner;
    
    /// @notice DataRegistry contract address
    address public dataRegistry;
    
    /// @notice AI Oracle address (authorized to submit AI verification results)
    address public aiOracle;
    
    /// @notice Record ID => Verification data
    mapping(uint256 => Verification) public verifications;
    
    /// @notice Patient address => Reputation data
    mapping(address => Reputation) public reputations;
    
    /// @notice Provider address => Provider data
    mapping(address => Provider) public providers;
    
    /// @notice Record ID => Patient address (for stake management)
    mapping(uint256 => address) public recordOwners;
    
    /// @notice Total stakes held by contract
    uint256 public totalStakesHeld;
    
    /// @notice Slashed funds available for withdrawal (by reporters)
    mapping(address => uint256) public slashRewards;
    
    // ============ Events ============
    
    event StakeDeposited(uint256 indexed recordId, address indexed patient, uint256 amount);
    event StakeReturned(uint256 indexed recordId, address indexed patient, uint256 amount);
    event StakeSlashed(uint256 indexed recordId, address indexed patient, uint256 amount, address indexed reporter);
    
    event AIVerificationRequested(uint256 indexed recordId, bytes32 documentHash, EvidenceType evidenceType);
    event AIVerificationCompleted(uint256 indexed recordId, uint8 confidenceScore, bool passed);
    
    event ProviderRegistered(address indexed provider, string name);
    event ProviderAttestationSubmitted(uint256 indexed recordId, address indexed provider);
    
    event RecordFlagged(uint256 indexed recordId, address indexed reporter, string reason);
    event ReputationUpdated(address indexed patient, uint16 newScore);
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyDataRegistry() {
        require(msg.sender == dataRegistry, "Only DataRegistry");
        _;
    }
    
    modifier onlyAIOracle() {
        require(msg.sender == aiOracle, "Only AI Oracle");
        _;
    }
    
    modifier onlyRegisteredProvider() {
        require(providers[msg.sender].isRegistered, "Not registered provider");
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        owner = msg.sender;
    }
    
    // ============ Configuration Functions ============
    
    /**
     * @notice Set the DataRegistry contract address
     * @param _dataRegistry Address of the DataRegistry contract
     */
    function setDataRegistry(address _dataRegistry) external onlyOwner {
        require(_dataRegistry != address(0), "Invalid address");
        dataRegistry = _dataRegistry;
    }
    
    /**
     * @notice Set the AI Oracle address
     * @param _aiOracle Address authorized to submit AI verification results
     */
    function setAIOracle(address _aiOracle) external onlyOwner {
        require(_aiOracle != address(0), "Invalid address");
        aiOracle = _aiOracle;
    }
    
    // ============ Stake Functions ============
    
    /**
     * @notice Deposit stake for a health record
     * @param recordId The record ID to stake for
     * @dev Called when patient submits health data
     */
    function depositStake(uint256 recordId) external payable {
        require(msg.value >= MIN_STAKE, "Stake below minimum");
        require(msg.value <= MAX_STAKE, "Stake above maximum");
        require(verifications[recordId].stakeAmount == 0, "Already staked");
        
        verifications[recordId].stakeAmount = msg.value;
        recordOwners[recordId] = msg.sender;
        totalStakesHeld += msg.value;
        
        // Initialize reputation if first submission
        if (reputations[msg.sender].totalSubmissions == 0) {
            reputations[msg.sender].reputationScore = INITIAL_REPUTATION;
        }
        reputations[msg.sender].totalSubmissions++;
        reputations[msg.sender].lastUpdated = block.timestamp;
        
        emit StakeDeposited(recordId, msg.sender, msg.value);
    }
    
    /**
     * @notice Return stake after verification passed and dispute window closed
     * @param recordId The record ID
     */
    function returnStake(uint256 recordId) external {
        Verification storage v = verifications[recordId];
        address patient = recordOwners[recordId];
        
        require(patient == msg.sender, "Not record owner");
        require(v.stakeAmount > 0, "No stake to return");
        require(
            v.status == VerificationStatus.AIVerified || 
            v.status == VerificationStatus.ProviderAttested,
            "Not verified"
        );
        require(
            block.timestamp >= v.verificationTimestamp + DISPUTE_WINDOW,
            "Dispute window not closed"
        );
        
        uint256 amount = v.stakeAmount;
        v.stakeAmount = 0;
        totalStakesHeld -= amount;
        
        // Update reputation positively
        _updateReputation(patient, true);
        
        payable(patient).transfer(amount);
        emit StakeReturned(recordId, patient, amount);
    }
    
    // ============ AI Document Verification Functions ============
    
    /**
     * @notice Request AI verification of a document
     * @param recordId The health record ID
     * @param documentHash Hash of the uploaded document
     * @param evidenceType Type of medical document
     */
    function requestAIVerification(
        uint256 recordId,
        bytes32 documentHash,
        EvidenceType evidenceType
    ) external {
        require(recordOwners[recordId] == msg.sender, "Not record owner");
        require(evidenceType != EvidenceType.None, "Invalid evidence type");
        
        Verification storage v = verifications[recordId];
        require(
            v.status == VerificationStatus.Unverified || 
            v.status == VerificationStatus.Pending,
            "Already verified"
        );
        
        v.status = VerificationStatus.Pending;
        v.documentHash = documentHash;
        v.evidenceType = evidenceType;
        
        emit AIVerificationRequested(recordId, documentHash, evidenceType);
    }
    
    /**
     * @notice Submit AI verification result (called by AI Oracle)
     * @param recordId The health record ID
     * @param confidenceScore AI confidence score (0-100)
     * @param extractionSummary Brief summary or IPFS hash of extraction details
     */
    function submitAIVerification(
        uint256 recordId,
        uint8 confidenceScore,
        string calldata extractionSummary
    ) external onlyAIOracle {
        require(confidenceScore <= 100, "Invalid confidence score");
        
        Verification storage v = verifications[recordId];
        require(v.status == VerificationStatus.Pending, "Not pending verification");
        
        v.aiConfidenceScore = confidenceScore;
        v.aiExtractionSummary = extractionSummary;
        v.verificationTimestamp = block.timestamp;
        
        bool passed = confidenceScore >= AI_CONFIDENCE_THRESHOLD;
        
        if (passed) {
            v.status = VerificationStatus.AIVerified;
            reputations[recordOwners[recordId]].verifiedCount++;
        } else {
            v.status = VerificationStatus.Flagged;
            reputations[recordOwners[recordId]].flaggedCount++;
        }
        
        _updateReputation(recordOwners[recordId], passed);
        
        emit AIVerificationCompleted(recordId, confidenceScore, passed);
    }
    
    // ============ Provider Attestation Functions ============
    
    /**
     * @notice Register as a healthcare provider
     * @param name Provider/institution name
     * @param licenseNumber Medical license number
     */
    function registerProvider(
        string calldata name,
        string calldata licenseNumber
    ) external {
        require(!providers[msg.sender].isRegistered, "Already registered");
        require(bytes(name).length > 0, "Name required");
        require(bytes(licenseNumber).length > 0, "License required");
        
        providers[msg.sender] = Provider({
            isRegistered: true,
            name: name,
            licenseNumber: licenseNumber,
            attestationCount: 0,
            registrationTime: block.timestamp
        });
        
        emit ProviderRegistered(msg.sender, name);
    }
    
    /**
     * @notice Attest to the authenticity of a health record
     * @param recordId The health record ID
     */
    function attestRecord(uint256 recordId) external onlyRegisteredProvider {
        Verification storage v = verifications[recordId];
        require(
            v.status != VerificationStatus.Slashed,
            "Record already slashed"
        );
        
        v.status = VerificationStatus.ProviderAttested;
        v.attestingProvider = msg.sender;
        v.verificationTimestamp = block.timestamp;
        
        providers[msg.sender].attestationCount++;
        reputations[recordOwners[recordId]].verifiedCount++;
        
        _updateReputation(recordOwners[recordId], true);
        
        emit ProviderAttestationSubmitted(recordId, msg.sender);
    }
    
    // ============ Flagging & Slashing Functions ============
    
    /**
     * @notice Flag a record as potentially fraudulent
     * @param recordId The health record ID
     * @param reason Reason for flagging
     */
    function flagRecord(uint256 recordId, string calldata reason) external {
        Verification storage v = verifications[recordId];
        require(
            v.status != VerificationStatus.Slashed,
            "Already slashed"
        );
        require(bytes(reason).length > 0, "Reason required");
        
        v.status = VerificationStatus.Flagged;
        reputations[recordOwners[recordId]].flaggedCount++;
        
        emit RecordFlagged(recordId, msg.sender, reason);
    }
    
    /**
     * @notice Slash stake for confirmed fraudulent data (owner only)
     * @param recordId The health record ID
     * @param reporter Address that reported the fraud (receives reward)
     */
    function slashStake(uint256 recordId, address reporter) external onlyOwner {
        Verification storage v = verifications[recordId];
        address patient = recordOwners[recordId];
        
        require(v.status == VerificationStatus.Flagged, "Not flagged");
        require(v.stakeAmount > 0, "No stake to slash");
        
        uint256 amount = v.stakeAmount;
        v.stakeAmount = 0;
        v.status = VerificationStatus.Slashed;
        totalStakesHeld -= amount;
        
        // Update reputation negatively
        reputations[patient].slashedCount++;
        _updateReputation(patient, false);
        
        // Half to reporter, half burned (sent to contract for future use)
        uint256 reporterReward = amount / 2;
        slashRewards[reporter] += reporterReward;
        
        emit StakeSlashed(recordId, patient, amount, reporter);
    }
    
    /**
     * @notice Withdraw slash rewards
     */
    function withdrawSlashRewards() external {
        uint256 amount = slashRewards[msg.sender];
        require(amount > 0, "No rewards");
        
        slashRewards[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }
    
    // ============ Reputation Functions ============
    
    /**
     * @notice Internal function to update reputation score
     * @param patient Patient address
     * @param positive Whether update is positive or negative
     */
    function _updateReputation(address patient, bool positive) internal {
        Reputation storage r = reputations[patient];
        
        if (positive) {
            // Positive: increase score (max 1000)
            if (r.reputationScore < 1000) {
                uint16 increase = 10; // +1.0%
                if (r.reputationScore + increase > 1000) {
                    r.reputationScore = 1000;
                } else {
                    r.reputationScore += increase;
                }
            }
        } else {
            // Negative: decrease score (min 0)
            uint16 decrease = 50; // -5.0%
            if (r.reputationScore < decrease) {
                r.reputationScore = 0;
            } else {
                r.reputationScore -= decrease;
            }
        }
        
        r.lastUpdated = block.timestamp;
        emit ReputationUpdated(patient, r.reputationScore);
    }
    
    /**
     * @notice Get patient reputation score
     * @param patient Patient address
     * @return score Reputation score (0-1000, representing 0-100.0%)
     */
    function getReputationScore(address patient) external view returns (uint16 score) {
        return reputations[patient].reputationScore;
    }
    
    /**
     * @notice Get full reputation data
     * @param patient Patient address
     * @return Reputation struct
     */
    function getReputation(address patient) external view returns (Reputation memory) {
        return reputations[patient];
    }
    
    /**
     * @notice Get verification data for a record
     * @param recordId The health record ID
     * @return Verification struct
     */
    function getVerification(uint256 recordId) external view returns (Verification memory) {
        return verifications[recordId];
    }
    
    /**
     * @notice Check if a provider is registered
     * @param provider Provider address
     * @return bool
     */
    function isProviderRegistered(address provider) external view returns (bool) {
        return providers[provider].isRegistered;
    }
    
    /**
     * @notice Calculate trust score combining verification + reputation + stake
     * @param recordId The health record ID
     * @return trustScore Combined trust score (0-100)
     */
    function calculateTrustScore(uint256 recordId) external view returns (uint8 trustScore) {
        Verification storage v = verifications[recordId];
        Reputation storage r = reputations[recordOwners[recordId]];
        
        uint256 score = 0;
        
        // Verification status (0-40 points)
        if (v.status == VerificationStatus.ProviderAttested) {
            score += 40;
        } else if (v.status == VerificationStatus.AIVerified) {
            score += uint256(v.aiConfidenceScore) * 40 / 100;
        } else if (v.status == VerificationStatus.Flagged || v.status == VerificationStatus.Slashed) {
            score = 0;
            return 0;
        }
        
        // Reputation (0-40 points)
        score += uint256(r.reputationScore) * 40 / 1000;
        
        // Stake bonus (0-20 points)
        if (v.stakeAmount >= MAX_STAKE) {
            score += 20;
        } else if (v.stakeAmount >= MIN_STAKE) {
            score += (v.stakeAmount * 20) / MAX_STAKE;
        }
        
        return uint8(score > 100 ? 100 : score);
    }
    
    // ============ Fallback ============
    
    receive() external payable {}
}
