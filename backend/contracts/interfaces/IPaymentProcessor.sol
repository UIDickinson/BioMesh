// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;


interface IPaymentProcessor {
    
    event PaymentReceived(
        address indexed researcher,
        uint256 amount,
        uint256 patientPool,
        uint256 platformFee
    );
    
    event EarningsDistributed(
        address indexed patient,
        uint256 amount,
        uint256 recordCount
    );
    
    event EarningsWithdrawn(
        address indexed patient,
        uint256 amount
    );
    
    event OracleAuthorized(address indexed oracle);
    event OracleRevoked(address indexed oracle);
    event FeeShareUpdated(uint256 patientShare, uint256 platformShare);
    event PlatformWalletUpdated(address indexed newWallet);
    
    
    function distributeEarnings(
        uint256[] memory recordIds,
        address researcher
    ) external payable;
    
    function withdrawEarnings() external;
    
    function getPatientEarnings(address patient) external view returns (uint256);
    
    function getResearcherSpending(address researcher) external view returns (uint256);
    
    function authorizeOracle(address oracle) external;
    
    function revokeOracle(address oracle) external;
    
    function updateFeeShares(
        uint256 _patientShare,
        uint256 _platformShare
    ) external;
    
    function updatePlatformWallet(address newWallet) external;
    
    function emergencyWithdraw() external;
    
    function getStats() external view returns (
        uint256 totalFees,
        uint256 totalDist,
        uint256 contractBal
    );
    
    function isAuthorizedOracle(address oracle) external view returns (bool);
    
    function patientEarnings(address patient) external view returns (uint256);
    
    function researcherSpending(address researcher) external view returns (uint256);
    
    function dataRegistry() external view returns (address);
    
    function authorizedOracles(address oracle) external view returns (bool);
    
    function platformWallet() external view returns (address);
    
    function owner() external view returns (address);
    
    function patientShare() external view returns (uint256);
    
    function platformShare() external view returns (uint256);
    
    function totalFeesCollected() external view returns (uint256);
    
    function totalDistributed() external view returns (uint256);
}