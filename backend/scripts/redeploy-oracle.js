/**
 * Redeploy ResearchOracle with updated code
 * 
 * This script deploys a new ResearchOracle and updates the authorization.
 * Use when the ResearchOracle contract code has been updated.
 * 
 * Run: npx hardhat run scripts/redeploy-oracle.js --network sepolia
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🔬 Redeploying ResearchOracle with updated code...\n");

    // Get existing addresses
    const DATA_REGISTRY_ADDRESS = process.env.DATA_REGISTRY_ADDRESS || "0xd51ca70ce024f2fdB1bC02692549C819da5407A2";
    const PAYMENT_PROCESSOR_ADDRESS = process.env.PAYMENT_PROCESSOR_ADDRESS || "0x17560A4F6D5783D6057A042A72B7BE4093DD8714";
    
    const queryFee = hre.ethers.parseEther("0.01"); // 0.01 ETH per query

    console.log("📋 Existing Contract Addresses:");
    console.log("   DataRegistry:", DATA_REGISTRY_ADDRESS);
    console.log("   PaymentProcessor:", PAYMENT_PROCESSOR_ADDRESS);

    const [deployer] = await hre.ethers.getSigners();
    console.log("\n👤 Deploying with account:", deployer.address);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("   Balance:", hre.ethers.formatEther(balance), "ETH");

    // Deploy new ResearchOracle
    console.log("\n⏳ Deploying new ResearchOracle...");
    const ResearchOracle = await hre.ethers.getContractFactory("ResearchOracle");
    const researchOracle = await ResearchOracle.deploy(
        DATA_REGISTRY_ADDRESS,
        PAYMENT_PROCESSOR_ADDRESS,
        queryFee
    );
    await researchOracle.waitForDeployment();
    const newOracleAddress = await researchOracle.getAddress();
    console.log("✅ New ResearchOracle deployed to:", newOracleAddress);

    // Authorize in DataRegistry
    console.log("\n⏳ Authorizing new oracle in DataRegistry...");
    const dataRegistryABI = [
        "function authorizeOracle(address oracle) external",
        "function authorizedOracles(address) view returns (bool)"
    ];
    const DataRegistry = new hre.ethers.Contract(DATA_REGISTRY_ADDRESS, dataRegistryABI, deployer);
    
    const authTx1 = await DataRegistry.authorizeOracle(newOracleAddress);
    await authTx1.wait();
    console.log("✅ Authorized in DataRegistry");

    // Authorize in PaymentProcessor
    console.log("\n⏳ Authorizing new oracle in PaymentProcessor...");
    const paymentProcessorABI = [
        "function authorizeOracle(address _oracle) external",
        "function authorizedOracles(address) view returns (bool)"
    ];
    const PaymentProcessor = new hre.ethers.Contract(PAYMENT_PROCESSOR_ADDRESS, paymentProcessorABI, deployer);
    
    const authTx2 = await PaymentProcessor.authorizeOracle(newOracleAddress);
    await authTx2.wait();
    console.log("✅ Authorized in PaymentProcessor");

    // Save updated deployment info
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const deploymentInfo = {
        network: "sepolia",
        chainId: 11155111,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            DataRegistry: DATA_REGISTRY_ADDRESS,
            PaymentProcessor: PAYMENT_PROCESSOR_ADDRESS,
            ResearchOracle: newOracleAddress
        },
        configuration: {
            queryFee: queryFee.toString(),
            platformWallet: deployer.address
        }
    };
    
    const filename = path.join(deploymentsDir, "sepolia-manual.json");
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));

    console.log("\n" + "=".repeat(60));
    console.log("✅ REDEPLOYMENT COMPLETE");
    console.log("=".repeat(60));
    console.log(`
New ResearchOracle Address: ${newOracleAddress}

🔗 Block Explorer: https://sepolia.etherscan.io/address/${newOracleAddress}

📝 Update your frontend .env.local:
   NEXT_PUBLIC_RESEARCH_ORACLE_ADDRESS=${newOracleAddress}

💾 Deployment info saved to: ${filename}
`);

    return newOracleAddress;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
