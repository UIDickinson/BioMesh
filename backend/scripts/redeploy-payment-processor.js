/**
 * Redeploy PaymentProcessor with updated code
 * 
 * This script deploys a new PaymentProcessor contract.
 * Use when the PaymentProcessor contract code has been updated.
 * 
 * ⚠️ WARNING: This creates a NEW PaymentProcessor.
 * - Unclaimed earnings in the old contract will NOT be migrated
 * - Patients should withdraw earnings from old contract first
 * 
 * After deployment:
 * 1. Authorize ResearchOracle in the new PaymentProcessor
 * 2. Update frontend .env.local
 * 
 * Run: npx hardhat run scripts/redeploy-payment-processor.js --network sepolia
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("💳 Redeploying PaymentProcessor with updated code...\n");
    console.log("⚠️  WARNING: Unclaimed earnings will NOT be migrated!\n");

    // Get existing DataRegistry address
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const deploymentFile = path.join(deploymentsDir, "sepolia-manual.json");
    
    let existingDeployment = {};
    if (fs.existsSync(deploymentFile)) {
        existingDeployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    }

    const DATA_REGISTRY_ADDRESS = process.env.DATA_REGISTRY_ADDRESS || 
        existingDeployment.contracts?.DataRegistry;
    
    if (!DATA_REGISTRY_ADDRESS || DATA_REGISTRY_ADDRESS === "NOT_DEPLOYED") {
        console.error("❌ DataRegistry address not found.");
        console.log("   Set DATA_REGISTRY_ADDRESS env var or ensure sepolia-manual.json has it.");
        process.exit(1);
    }

    console.log("📋 Using DataRegistry:", DATA_REGISTRY_ADDRESS);

    const [deployer] = await hre.ethers.getSigners();
    console.log("\n👤 Deploying with account:", deployer.address);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("   Balance:", hre.ethers.formatEther(balance), "ETH");

    if (balance < hre.ethers.parseEther("0.1")) {
        console.error("❌ Insufficient balance. Need at least 0.1 ETH.");
        process.exit(1);
    }

    const platformWallet = process.env.PLATFORM_WALLET || deployer.address;
    console.log("   Platform Wallet:", platformWallet);

    // Deploy new PaymentProcessor
    console.log("\n⏳ Deploying new PaymentProcessor...");
    const PaymentProcessor = await hre.ethers.getContractFactory("PaymentProcessor");
    const paymentProcessor = await PaymentProcessor.deploy(
        DATA_REGISTRY_ADDRESS,
        platformWallet
    );
    await paymentProcessor.waitForDeployment();
    const newAddress = await paymentProcessor.getAddress();
    console.log("✅ New PaymentProcessor deployed to:", newAddress);

    // Authorize existing ResearchOracle if it exists
    const researchOracleAddress = existingDeployment.contracts?.ResearchOracle;
    if (researchOracleAddress && researchOracleAddress !== "NOT_DEPLOYED") {
        console.log("\n⏳ Authorizing existing ResearchOracle...");
        try {
            const authTx = await paymentProcessor.authorizeOracle(researchOracleAddress);
            await authTx.wait();
            console.log("✅ ResearchOracle authorized:", researchOracleAddress);
        } catch (err) {
            console.log("⚠️  Could not authorize ResearchOracle:", err.message);
        }
    }

    // Save updated deployment info
    const deploymentInfo = {
        network: "sepolia",
        chainId: 11155111,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            DataRegistry: DATA_REGISTRY_ADDRESS,
            PaymentProcessor: newAddress,
            ResearchOracle: researchOracleAddress || "NOT_DEPLOYED"
        },
        configuration: {
            queryFee: existingDeployment.configuration?.queryFee || hre.ethers.parseEther("0.01").toString(),
            platformWallet: platformWallet
        }
    };
    
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

    console.log("\n" + "=".repeat(70));
    console.log("✅ PAYMENTPROCESSOR REDEPLOYMENT COMPLETE");
    console.log("=".repeat(70));
    console.log(`
New PaymentProcessor Address: ${newAddress}
Old PaymentProcessor: ${existingDeployment.contracts?.PaymentProcessor || "N/A"}

🔗 Block Explorer: https://sepolia.etherscan.io/address/${newAddress}

📝 Update frontend .env.local:
   NEXT_PUBLIC_PAYMENT_PROCESSOR_ADDRESS=${newAddress}

⚠️  If you also need to redeploy ResearchOracle:
   npx hardhat run scripts/redeploy-oracle.js --network sepolia

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
