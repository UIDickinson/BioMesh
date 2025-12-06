const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Setting individual query fee with account:", deployer.address);

  const RESEARCH_ORACLE_ADDRESS = "0x2F7603e5E9ac4F0a443996731a825Fa237d1B714";
  
  const ResearchOracle = await hre.ethers.getContractAt(
    [
      "function setIndividualQueryFee(uint256 _fee) external",
      "function individualQueryFee() view returns (uint256)",
      "function queryFee() view returns (uint256)"
    ],
    RESEARCH_ORACLE_ADDRESS
  );

  // Get current fees
  const currentQueryFee = await ResearchOracle.queryFee();
  const currentIndividualFee = await ResearchOracle.individualQueryFee();
  
  console.log("Current query fee:", hre.ethers.formatEther(currentQueryFee), "ETH");
  console.log("Current individual query fee:", hre.ethers.formatEther(currentIndividualFee), "ETH");

  // Set individual query fee to 0.02 ETH (2x the aggregate fee)
  const newIndividualFee = hre.ethers.parseEther("0.02");
  
  console.log("\nSetting individual query fee to:", hre.ethers.formatEther(newIndividualFee), "ETH");
  
  const tx = await ResearchOracle.setIndividualQueryFee(newIndividualFee);
  console.log("Transaction sent:", tx.hash);
  
  await tx.wait();
  console.log("✅ Individual query fee set successfully!");

  // Verify
  const updatedFee = await ResearchOracle.individualQueryFee();
  console.log("Updated individual query fee:", hre.ethers.formatEther(updatedFee), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
