/**
 * Production Deployment Script for BioMesh
 * 
 * This script deploys the BioMesh contracts to Sepolia testnet.
 * 
 * Prerequisites:
 * 1. Set PRIVATE_KEY in backend/.env
 * 2. Set SEPOLIA_RPC_URL in backend/.env (or use default)
 * 3. Have Sepolia ETH in deployer wallet
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-production.js --network sepolia
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 BioMesh Production Deployment");
  console.log("=".repeat(60) + "\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  
  console.log("📋 Deployment Configuration:");
  console.log(`   Network: ${hre.network.name}`);
  console.log(`   Chain ID: ${hre.network.config.chainId}`);
  console.log(`   Deployer: ${deployerAddress}`);
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployerAddress);
  const balanceEth = hre.ethers.formatEther(balance);
  console.log(`   Balance: ${balanceEth} ETH`);
  
  if (parseFloat(balanceEth) < 0.01) {
    console.error("\n❌ Insufficient balance! Need at least 0.01 ETH for deployment.");
    console.log("   Get Sepolia ETH from: https://sepoliafaucet.com/");
    process.exit(1);
  }

  console.log("\n" + "-".repeat(60));
  console.log("📦 Deploying Contracts...");
  console.log("-".repeat(60) + "\n");

  // 1. Deploy DataRegistry
  console.log("1️⃣  Deploying DataRegistry...");
  const DataRegistry = await hre.ethers.getContractFactory("DataRegistry");
  const dataRegistry = await DataRegistry.deploy();
  await dataRegistry.waitForDeployment();
  const dataRegistryAddress = await dataRegistry.getAddress();
  console.log(`   ✅ DataRegistry deployed to: ${dataRegistryAddress}`);

  // 2. Deploy PaymentProcessor
  console.log("\n2️⃣  Deploying PaymentProcessor...");
  const PaymentProcessor = await hre.ethers.getContractFactory("PaymentProcessor");
  // PaymentProcessor constructor takes: dataRegistry address, platform wallet
  const paymentProcessor = await PaymentProcessor.deploy(
    dataRegistryAddress,
    deployerAddress // Platform wallet = deployer for now
  );
  await paymentProcessor.waitForDeployment();
  const paymentProcessorAddress = await paymentProcessor.getAddress();
  console.log(`   ✅ PaymentProcessor deployed to: ${paymentProcessorAddress}`);

  // 3. Deploy ResearchOracle
  console.log("\n3️⃣  Deploying ResearchOracle...");
  const ResearchOracle = await hre.ethers.getContractFactory("ResearchOracle");
  // ResearchOracle constructor takes: dataRegistry, paymentProcessor, queryFee
  const queryFee = hre.ethers.parseEther("0.001"); // 0.001 ETH per query
  const researchOracle = await ResearchOracle.deploy(
    dataRegistryAddress,
    paymentProcessorAddress,
    queryFee
  );
  await researchOracle.waitForDeployment();
  const researchOracleAddress = await researchOracle.getAddress();
  console.log(`   ✅ ResearchOracle deployed to: ${researchOracleAddress}`);

  console.log("\n" + "-".repeat(60));
  console.log("🔗 Configuring Contract Permissions...");
  console.log("-".repeat(60) + "\n");

  // 4. Authorize ResearchOracle in DataRegistry
  console.log("4️⃣  Authorizing ResearchOracle in DataRegistry...");
  const authTx1 = await dataRegistry.authorizeOracle(researchOracleAddress);
  await authTx1.wait();
  console.log("   ✅ ResearchOracle authorized in DataRegistry");

  // 5. Authorize ResearchOracle in PaymentProcessor
  console.log("\n5️⃣  Authorizing ResearchOracle in PaymentProcessor...");
  const authTx2 = await paymentProcessor.authorizeOracle(researchOracleAddress);
  await authTx2.wait();
  console.log("   ✅ ResearchOracle authorized in PaymentProcessor");

  // Save deployment info
  const deployment = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployerAddress,
    timestamp: new Date().toISOString(),
    contracts: {
      DataRegistry: dataRegistryAddress,
      PaymentProcessor: paymentProcessorAddress,
      ResearchOracle: researchOracleAddress,
    },
    configuration: {
      queryFee: hre.ethers.formatEther(queryFee) + " ETH",
      platformWallet: deployerAddress,
    }
  };

  // Ensure deployments directory exists
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save to JSON file
  const filename = `${hre.network.name}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deployment, null, 2));
  console.log(`\n📁 Deployment saved to: ${filepath}`);

  // Also save as latest
  const latestPath = path.join(deploymentsDir, `${hre.network.name}-latest.json`);
  fs.writeFileSync(latestPath, JSON.stringify(deployment, null, 2));

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("✅ DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  
  console.log("\n📋 Contract Addresses:");
  console.log(`   DataRegistry:      ${dataRegistryAddress}`);
  console.log(`   PaymentProcessor:  ${paymentProcessorAddress}`);
  console.log(`   ResearchOracle:    ${researchOracleAddress}`);

  console.log("\n" + "-".repeat(60));
  console.log("📝 NEXT STEPS:");
  console.log("-".repeat(60));
  console.log("\n1. Copy these addresses to frontend/.env.local:\n");
  console.log(`NEXT_PUBLIC_DATA_REGISTRY_ADDRESS=${dataRegistryAddress}`);
  console.log(`NEXT_PUBLIC_PAYMENT_PROCESSOR_ADDRESS=${paymentProcessorAddress}`);
  console.log(`NEXT_PUBLIC_RESEARCH_ORACLE_ADDRESS=${researchOracleAddress}`);
  console.log(`NEXT_PUBLIC_CHAIN_ID=11155111`);
  
  console.log("\n2. Update frontend/lib/encryption.js:");
  console.log("   - If using mock TFHE (current deployment): USE_REAL_FHE = false");
  console.log("   - If using real @fhevm/solidity: USE_REAL_FHE = true");
  
  console.log("\n3. Verify contracts on Etherscan (optional):");
  console.log(`   npx hardhat verify --network sepolia ${dataRegistryAddress}`);
  console.log(`   npx hardhat verify --network sepolia ${paymentProcessorAddress} "${dataRegistryAddress}" "${deployerAddress}"`);
  console.log(`   npx hardhat verify --network sepolia ${researchOracleAddress} "${dataRegistryAddress}" "${paymentProcessorAddress}" "${queryFee}"`);
  
  console.log("\n" + "=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
