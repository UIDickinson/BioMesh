// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import "./interfaces/IDataRegistry.sol";
import "./interfaces/IPaymentProcessor.sol";

/**
 * @title PaymentProcessor
 * @notice Handle payments and micropayment distribution
 * @dev Distributes query fees to data contributors and platform
 */
contract PaymentProcessor {
    
    // ============ State Variables ============
    
    /// @notice Accumulated earnings per patient
    mapping(address => uint256) public patientEarnings;
    
    /// @notice Total spending per researcher
    mapping(address => uint256) public researcherSpending;
    
    /// @notice Data registry contract
    IDataRegistry public dataRegistry;
    
    /// @notice Authorized oracles that can trigger distributions
    mapping(address => bool) public authorizedOracles;
    
    /// @notice Platform fee recipient
    address public platformWallet;
    
    /// @notice Owner address
    address public owner;
    
    /// @notice Fee split percentages (basis points, 10000 = 100%)
    uint256 public patientShare = 7000;  // 70%
    uint256 public platformShare = 3000; // 30%
    
    /// @notice Total fees collected
    uint256 public totalFeesCollected;
    
    /// @notice Total distributed to patients
    uint256 public totalDistributed;
    
    /// @notice Total unclaimed patient earnings (for accurate accounting)
    uint256 public totalUnclaimed;
    
    /// @notice Reentrancy guard
    bool private locked;
    
    /// @notice Maximum batch size for safety
    uint256 public constant MAX_BATCH_SIZE = 100;
    
    // ============ Events ============
    
    event PaymentReceived(
        address indexed researcher,
        uint256 indexed amount,
        uint256 patientPool,
        uint256 platformFee
    );
    
    event EarningsDistributed(
        address indexed patient,
        uint256 indexed amount,
        uint256 recordCount
    );
    
    event EarningsWithdrawn(
        address indexed patient,
        uint256 indexed amount
    );
    
    event OracleAuthorized(address indexed oracle);
    event OracleRevoked(address indexed oracle);
    event FeeShareUpdated(uint256 indexed patientShare, uint256 indexed platformShare);
    event PlatformWalletUpdated(address indexed newWallet);
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyOracle() {
        require(authorizedOracles[msg.sender], "Only authorized oracle");
        _;
    }
    
    modifier noReentrancy() {
        require(!locked, "Reentrancy detected");
        locked = true;
        _;
        locked = false;
    }
    
    // ============ Constructor ============
    
    constructor(address _dataRegistry, address _platformWallet) {
        require(_dataRegistry != address(0), "Invalid registry");
        require(_platformWallet != address(0), "Invalid platform wallet");
        
        dataRegistry = IDataRegistry(_dataRegistry);
        platformWallet = _platformWallet;
        owner = msg.sender;
    }
    
    // ============ Core Functions ============
    
    /**
     * @notice Distribute query fees to contributing patients
     * @param recordIds Array of record IDs used in the query
     * @param researcher Address of the researcher who paid
     */
    function distributeEarnings(
        uint256[] memory recordIds,
        address researcher
    ) external payable onlyOracle {
        require(msg.value > 0, "No payment received");
        require(recordIds.length > 0, "No records provided");
        
        // Calculate splits
        uint256 patientPool = (msg.value * patientShare) / 10000;
        uint256 platformFee = (msg.value * platformShare) / 10000;
        
        // Track unique patients to avoid duplicate payments
        address[] memory uniquePatients = new address[](recordIds.length);
        uint256 uniqueCount = 0;
        
        for (uint256 i = 0; i < recordIds.length; i++) {
            // HealthRecord: age, gender, ethnicity, diagnosis, treatmentOutcome,
            // biomarker, bmi, systolicBP, diastolicBP, patient, timestamp, isActive
            (
                ,  // age
                ,  // gender
                ,  // ethnicity
                ,  // diagnosis
                ,  // treatmentOutcome
                ,  // biomarker
                ,  // bmi
                ,  // systolicBP
                ,  // diastolicBP
                address patient,
                ,  // timestamp
                bool isActive
            ) = dataRegistry.records(recordIds[i]);
            
            // Only count active records
            if (!isActive) continue;
            
            // Check if patient already counted
            bool isDuplicate = false;
            for (uint256 j = 0; j < uniqueCount; j++) {
                if (uniquePatients[j] == patient) {
                    isDuplicate = true;
                    break;
                }
            }
            
            if (!isDuplicate) {
                uniquePatients[uniqueCount] = patient;
                uniqueCount++;
            }
        }
        
        require(uniqueCount > 0, "No valid patients found");
        
        // Distribute earnings equally among unique patients
        uint256 perPatientShare = patientPool / uniqueCount;
        uint256 actualDistributed = 0;
        
        for (uint256 i = 0; i < uniqueCount; i++) {
            address patient = uniquePatients[i];
            patientEarnings[patient] += perPatientShare;
            actualDistributed += perPatientShare;
            emit EarningsDistributed(patient, perPatientShare, recordIds.length);
        }
        
        // Handle dust (remainder from integer division) - give to first patient
        uint256 dust = patientPool - actualDistributed;
        if (dust > 0 && uniqueCount > 0) {
            patientEarnings[uniquePatients[0]] += dust;
            actualDistributed += dust;
        }
        
        // Transfer platform fee
        (bool success, ) = platformWallet.call{value: platformFee}("");
        require(success, "Platform fee transfer failed");
        
        // Update tracking
        totalFeesCollected += msg.value;
        totalDistributed += actualDistributed;
        totalUnclaimed += actualDistributed;
        researcherSpending[researcher] += msg.value;
        
        emit PaymentReceived(researcher, msg.value, patientPool, platformFee);
    }
    
    /**
     * @notice Allow patients to withdraw their earnings
     */
    function withdrawEarnings() external noReentrancy {
        uint256 amount = patientEarnings[msg.sender];
        require(amount > 0, "No earnings to withdraw");
        
        // Reset balance before transfer (checks-effects-interactions)
        patientEarnings[msg.sender] = 0;
        totalUnclaimed -= amount;
        
        // Transfer earnings
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit EarningsWithdrawn(msg.sender, amount);
    }
    
    /**
     * @notice Get patient's withdrawable earnings
     * @param patient The patient address
     * @return Earnings amount in wei
     */
    function getPatientEarnings(address patient) 
        external 
        view 
        returns (uint256) 
    {
        return patientEarnings[patient];
    }
    
    /**
     * @notice Get researcher's total spending
     * @param researcher The researcher address
     * @return Total spending in wei
     */
    function getResearcherSpending(address researcher) 
        external 
        view 
        returns (uint256) 
    {
        return researcherSpending[researcher];
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Authorize an oracle to trigger distributions
     * @param oracle Address of the oracle contract
     */
    function authorizeOracle(address oracle) external onlyOwner {
        require(oracle != address(0), "Invalid oracle");
        authorizedOracles[oracle] = true;
        emit OracleAuthorized(oracle);
    }
    
    /**
     * @notice Revoke oracle authorization
     * @param oracle Address of the oracle contract
     */
    function revokeOracle(address oracle) external onlyOwner {
        authorizedOracles[oracle] = false;
        emit OracleRevoked(oracle);
    }
    
    /**
     * @notice Update fee share percentages
     * @param _patientShare New patient share in basis points
     * @param _platformShare New platform share in basis points
     */
    function updateFeeShares(
        uint256 _patientShare,
        uint256 _platformShare
    ) external onlyOwner {
        require(
            _patientShare + _platformShare == 10000,
            "Shares must sum to 10000"
        );
        
        patientShare = _patientShare;
        platformShare = _platformShare;
        
        emit FeeShareUpdated(_patientShare, _platformShare);
    }
    
    /**
     * @notice Update platform wallet address
     * @param newWallet New platform wallet address
     */
    function updatePlatformWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Invalid wallet");
        platformWallet = newWallet;
        emit PlatformWalletUpdated(newWallet);
    }
    
    /**
     * @notice Emergency withdrawal (only unclaimed funds)
     * @dev Can only withdraw funds not allocated to patients
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 contractBalance = address(this).balance;
        
        // Calculate withdrawable amount (contract balance minus unclaimed patient funds)
        uint256 withdrawable = contractBalance > totalUnclaimed 
            ? contractBalance - totalUnclaimed 
            : 0;
        
        require(withdrawable > 0, "No withdrawable funds");
        
        (bool success, ) = owner.call{value: withdrawable}("");
        require(success, "Transfer failed");
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get contract statistics
     * @return totalFees Total fees collected
     * @return totalDist Total distributed to patients
     * @return contractBal Current contract balance
     */
    function getStats() 
        external 
        view 
        returns (
            uint256 totalFees,
            uint256 totalDist,
            uint256 contractBal,
            uint256 unclaimed
        ) 
    {
        return (
            totalFeesCollected,
            totalDistributed,
            address(this).balance,
            totalUnclaimed
        );
    }
    
    /**
     * @notice Check if address is authorized oracle
     * @param oracle Address to check
     * @return Boolean indicating authorization status
     */
    function isAuthorizedOracle(address oracle) 
        external 
        view 
        returns (bool) 
    {
        return authorizedOracles[oracle];
    }
    
    // ============ Fallback Functions ============
    
    /**
     * @notice Fallback function to handle unexpected ETH transfers
     * @dev Allows contract to receive ETH without explicit function calls
     */
    receive() external payable {
        // Silently accept ETH transfers
    }
}