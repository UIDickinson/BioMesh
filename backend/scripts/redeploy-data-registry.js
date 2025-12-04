/**
 * Redeploy DataRegistry with updated code
 * 
 * This script deploys a new DataRegistry contract.
 * Use when the DataRegistry contract code has been updated.
 * 
 * ⚠️ WARNING: This creates a NEW DataRegistry with NO existing records.
 * All patient data from the old contract will NOT be migrated.
 * 
 * After deployment:
 * 1. Update PaymentProcessor to point to new DataRegistry
 * 2. Update ResearchOracle to point to new DataRegistry
 * 3. Update frontend .env.local
 * 4. Patients will need to re-submit their health data
 * 
 * Run: npx hardhat run scripts/redeploy-data-registry.js --network sepolia
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("📊 Redeploying DataRegistry with updated code...\n");
    console.log("⚠️  WARNING: This creates a NEW contract. Existing records will NOT be migrated!\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("👤 Deploying with account:", deployer.address);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("   Balance:", hre.ethers.formatEther(balance), "ETH");

    if (balance < hre.ethers.parseEther("0.1")) {
        console.error("❌ Insufficient balance. Need at least 0.1 ETH.");
        process.exit(1);
    }

    // Deploy new DataRegistry
    console.log("\n⏳ Deploying new DataRegistry...");
    const DataRegistry = await hre.ethers.getContractFactory("DataRegistry");
    const dataRegistry = await DataRegistry.deploy();
    await dataRegistry.waitForDeployment();
    const newAddress = await dataRegistry.getAddress();
    console.log("✅ New DataRegistry deployed to:", newAddress);

    // Load existing deployment info
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const deploymentFile = path.join(deploymentsDir, "sepolia-manual.json");
    
    let existingDeployment = {};
    if (fs.existsSync(deploymentFile)) {
        existingDeployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
        console.log("\n📋 Old DataRegistry:", existingDeployment.contracts?.DataRegistry || "N/A");
    }

    // Save updated deployment info
    const deploymentInfo = {
        network: "sepolia",
        chainId: 11155111,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            DataRegistry: newAddress,
            PaymentProcessor: existingDeployment.contracts?.PaymentProcessor || "NOT_DEPLOYED",
            ResearchOracle: existingDeployment.contracts?.ResearchOracle || "NOT_DEPLOYED"
        },
        configuration: existingDeployment.configuration || {
            queryFee: hre.ethers.parseEther("0.01").toString(),
            platformWallet: deployer.address
        },
        notes: "DataRegistry redeployed - PaymentProcessor and ResearchOracle need to be updated"
    };
    
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

    console.log("\n" + "=".repeat(70));
    console.log("✅ DATAREGISTRY REDEPLOYMENT COMPLETE");
    console.log("=".repeat(70));
    console.log(`
New DataRegistry Address: ${newAddress}

🔗 Block Explorer: https://sepolia.etherscan.io/address/${newAddress}

⚠️  IMPORTANT NEXT STEPS:

1. Redeploy PaymentProcessor with new DataRegistry:
   npx hardhat run scripts/redeploy-payment-processor.js --network sepolia

2. Redeploy ResearchOracle with new addresses:
   npx hardhat run scripts/redeploy-oracle.js --network sepolia

3. Update frontend .env.local:
   NEXT_PUBLIC_DATA_REGISTRY_ADDRESS=${newAddress}

4. Restart frontend to pick up new address

💾 Deployment info saved to: ${deploymentFile}
`);

    return newAddress;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
