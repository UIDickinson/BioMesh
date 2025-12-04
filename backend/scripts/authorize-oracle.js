/**
 * Authorize ResearchOracle in DataRegistry and PaymentProcessor
 * 
 * This script authorizes the ResearchOracle to:
 * 1. Query data from DataRegistry
 * 2. Distribute payments via PaymentProcessor
 * 
 * Run: DATA_REGISTRY_ADDRESS=0x... PAYMENT_PROCESSOR_ADDRESS=0x... RESEARCH_ORACLE_ADDRESS=0x... npx hardhat run scripts/authorize-oracle.js --network sepolia
 */

const hre = require("hardhat");

async function main() {
    console.log("🔐 Oracle Authorization Script\n");

    // Get deployment addresses from environment or use defaults from sepolia-manual.json
    const DATA_REGISTRY_ADDRESS = process.env.DATA_REGISTRY_ADDRESS || "0xd51ca70ce024f2fdB1bC02692549C819da5407A2";
    const PAYMENT_PROCESSOR_ADDRESS = process.env.PAYMENT_PROCESSOR_ADDRESS || "0x17560A4F6D5783D6057A042A72B7BE4093DD8714";
    const RESEARCH_ORACLE_ADDRESS = process.env.RESEARCH_ORACLE_ADDRESS || "0x5E39428d803498705282De6e3Bc85BC123EAEBD0";

    console.log("📋 Contract Addresses:");
    console.log("   DataRegistry:", DATA_REGISTRY_ADDRESS);
    console.log("   PaymentProcessor:", PAYMENT_PROCESSOR_ADDRESS);
    console.log("   ResearchOracle:", RESEARCH_ORACLE_ADDRESS);

    const [deployer] = await hre.ethers.getSigners();
    console.log("\n👤 Using account:", deployer.address);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("   Balance:", hre.ethers.formatEther(balance), "ETH");

    // Get contract instances using minimal ABI
    const dataRegistryABI = [
        "function owner() view returns (address)",
        "function authorizedOracles(address) view returns (bool)",
        "function authorizeOracle(address oracle) external"
    ];
    
    const paymentProcessorABI = [
        "function owner() view returns (address)",
        "function authorizedOracles(address) view returns (bool)",
        "function authorizeOracle(address _oracle) external"
    ];
    
    const DataRegistry = new hre.ethers.Contract(DATA_REGISTRY_ADDRESS, dataRegistryABI, deployer);
    const PaymentProcessor = new hre.ethers.Contract(PAYMENT_PROCESSOR_ADDRESS, paymentProcessorABI, deployer);

    // ============ Check DataRegistry ============
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 DataRegistry Authorization");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const drOwner = await DataRegistry.owner();
    console.log("   Owner:", drOwner);
    
    if (drOwner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log("   ⚠️  You are not the owner. Cannot authorize.");
    } else {
        const isAuthorizedDR = await DataRegistry.authorizedOracles(RESEARCH_ORACLE_ADDRESS);
        console.log("   Current status:", isAuthorizedDR ? "✅ Authorized" : "❌ Not authorized");

        if (!isAuthorizedDR) {
            console.log("\n   ⏳ Authorizing ResearchOracle in DataRegistry...");
            const authTx = await DataRegistry.authorizeOracle(RESEARCH_ORACLE_ADDRESS);
            console.log("   TX Hash:", authTx.hash);
            await authTx.wait();
            console.log("   ✅ ResearchOracle authorized in DataRegistry!");
        }
    }

    // ============ Check PaymentProcessor ============
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("💳 PaymentProcessor Authorization");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const ppOwner = await PaymentProcessor.owner();
    console.log("   Owner:", ppOwner);
    
    if (ppOwner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log("   ⚠️  You are not the owner. Cannot authorize.");
    } else {
        const isAuthorizedPP = await PaymentProcessor.authorizedOracles(RESEARCH_ORACLE_ADDRESS);
        console.log("   Current status:", isAuthorizedPP ? "✅ Authorized" : "❌ Not authorized");
        
        if (!isAuthorizedPP) {
            console.log("\n   ⏳ Authorizing ResearchOracle in PaymentProcessor...");
            const authTx = await PaymentProcessor.authorizeOracle(RESEARCH_ORACLE_ADDRESS);
            console.log("   TX Hash:", authTx.hash);
            await authTx.wait();
            console.log("   ✅ ResearchOracle authorized in PaymentProcessor!");
        }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Authorization complete!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
