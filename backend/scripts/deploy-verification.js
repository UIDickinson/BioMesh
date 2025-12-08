const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploy VerificationRegistry contract
 * This is a standalone deployment that links to existing DataRegistry
 */
async function main() {
  console.log("🔐 Deploying VerificationRegistry...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  const networkInfo = await ethers.provider.getNetwork();
  console.log("🌐 Network:", hre.network.name);
  console.log("🔗 Chain ID:", networkInfo.chainId);
  console.log("");

  // Load existing deployment info to get DataRegistry address
  const deploymentPath = path.join(__dirname, "../deployments/sepolia-manual.json");
  let existingDeployment = {};
  
  if (fs.existsSync(deploymentPath)) {
    existingDeployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    console.log("📄 Found existing deployment info");
  }
  
  const dataRegistryAddress = process.env.DATA_REGISTRY_ADDRESS || 
    existingDeployment.contracts?.DataRegistry?.address ||
    existingDeployment.contracts?.DataRegistry;
    
  if (!dataRegistryAddress) {
    throw new Error("❌ DATA_REGISTRY_ADDRESS not set. Set it in env or deploy DataRegistry first.");
  }
  
  console.log("📊 DataRegistry address:", dataRegistryAddress);
  console.log("");

  // ============ Deploy VerificationRegistry ============
  console.log("🔐 Deploying VerificationRegistry...");
  const VerificationRegistry = await ethers.getContractFactory("VerificationRegistry");
  const verificationRegistry = await VerificationRegistry.deploy();
  await verificationRegistry.waitForDeployment();
  const verificationRegistryAddress = await verificationRegistry.getAddress();
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log("✅ VerificationRegistry deployed to:", verificationRegistryAddress);
  console.log("   Block:", blockNumber);
  console.log("");

  // ============ Setup Configuration ============
  console.log("⚙️  Configuring VerificationRegistry...");
  
  // Set DataRegistry address
  console.log("   Setting DataRegistry address...");
  const setDataRegistryTx = await verificationRegistry.setDataRegistry(dataRegistryAddress);
  await setDataRegistryTx.wait();
  console.log("   ✅ DataRegistry linked");
  
  // Set AI Oracle address (deployer for now - in production this would be a separate oracle service)
  console.log("   Setting AI Oracle address (deployer for testing)...");
  const setAIOracleTx = await verificationRegistry.setAIOracle(deployer.address);
  await setAIOracleTx.wait();
  console.log("   ✅ AI Oracle set to:", deployer.address);
  console.log("");

  // ============ Deployment Summary ============
  console.log("=".repeat(70));
  console.log("📋 VERIFICATION REGISTRY DEPLOYMENT SUMMARY");
  console.log("=".repeat(70));
  console.log(`
Network:                  ${hre.network.name}
Chain ID:                 ${networkInfo.chainId}
Deployer Address:         ${deployer.address}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 CONTRACT ADDRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VerificationRegistry:     ${verificationRegistryAddress}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️  CONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DataRegistry:             ${dataRegistryAddress}
AI Oracle:                ${deployer.address}
Min Stake:                0.001 ETH
Max Stake:                0.1 ETH
AI Confidence Threshold:  70%
Dispute Window:           7 days

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 BLOCK EXPLORER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
https://sepolia.etherscan.io/address/${verificationRegistryAddress}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Update frontend .env.local:
   NEXT_PUBLIC_VERIFICATION_REGISTRY_ADDRESS=${verificationRegistryAddress}

2. Optionally verify contract:
   npx hardhat verify --network sepolia ${verificationRegistryAddress}

3. Set proper AI Oracle address in production:
   verificationRegistry.setAIOracle(oracleServiceAddress)
  `);
  console.log("=".repeat(70));

  // ============ Update Deployment File ============
  existingDeployment.contracts = existingDeployment.contracts || {};
  existingDeployment.contracts.VerificationRegistry = {
    address: verificationRegistryAddress,
    blockNumber: blockNumber,
    type: "Data Verification & Reputation",
    configuration: {
      dataRegistry: dataRegistryAddress,
      aiOracle: deployer.address,
      minStake: "0.001 ETH",
      maxStake: "0.1 ETH",
      confidenceThreshold: 70,
      disputeWindow: "7 days"
    }
  };
  existingDeployment.lastUpdated = new Date().toISOString();
  
  fs.writeFileSync(deploymentPath, JSON.stringify(existingDeployment, null, 2));
  console.log("\n✅ Deployment info saved to:", deploymentPath);

  return {
    verificationRegistry: verificationRegistryAddress
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
