const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploy ALL BioMesh contracts to Sepolia testnet
 * 
 * This script deploys:
 * 1. DataRegistry - Core data storage with FHE
 * 2. PaymentProcessor - Payment and earnings management
 * 3. ResearchOracle - Encrypted query execution
 * 4. ConsentRegistry - Consent forms and World ID verification
 * 5. VerificationRegistry - Data authenticity verification
 */
async function main() {
  console.log("🚀 Starting FULL BioMesh Deployment to Sepolia...\n");
  console.log("=".repeat(70));

  // ============ Environment Validation ============
  if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY not set in environment variables.");
  }

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  if (ethers.parseEther("0.3") > balance) {
    throw new Error("❌ Insufficient balance. You need at least 0.3 ETH to deploy all contracts.");
  }
  
  const networkInfo = await ethers.provider.getNetwork();
  console.log("🌐 Network:", hre.network.name);
  console.log("🔗 Chain ID:", networkInfo.chainId);
  console.log("=".repeat(70));
  console.log("");

  const deploymentStartTime = Date.now();
  const addresses = {};
  const blockNumbers = {};

  // ============ Deploy Parameters ============
  const queryFee = ethers.parseEther("0.01"); // 0.01 ETH per query
  const individualQueryFee = ethers.parseEther("0.02"); // 0.02 ETH for individual records
  const platformWallet = deployer.address;
  const worldIdVerifier = ethers.ZeroAddress; // Demo mode - no real World ID verification

  // ============ 1. Deploy DataRegistry ============
  console.log("1️⃣  Deploying DataRegistry...");
  const DataRegistry = await ethers.getContractFactory("DataRegistry");
  const dataRegistry = await DataRegistry.deploy();
  await dataRegistry.waitForDeployment();
  addresses.DataRegistry = await dataRegistry.getAddress();
  blockNumbers.DataRegistry = await ethers.provider.getBlockNumber();
  console.log("   ✅ DataRegistry:", addresses.DataRegistry);
  console.log("");

  // ============ 2. Deploy PaymentProcessor ============
  console.log("2️⃣  Deploying PaymentProcessor...");
  const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
  const paymentProcessor = await PaymentProcessor.deploy(
    addresses.DataRegistry,
    platformWallet
  );
  await paymentProcessor.waitForDeployment();
  addresses.PaymentProcessor = await paymentProcessor.getAddress();
  blockNumbers.PaymentProcessor = await ethers.provider.getBlockNumber();
  console.log("   ✅ PaymentProcessor:", addresses.PaymentProcessor);
  console.log("");

  // ============ 3. Deploy ResearchOracle ============
  console.log("3️⃣  Deploying ResearchOracle...");
  const ResearchOracle = await ethers.getContractFactory("ResearchOracle");
  const researchOracle = await ResearchOracle.deploy(
    addresses.DataRegistry,
    addresses.PaymentProcessor,
    queryFee
  );
  await researchOracle.waitForDeployment();
  addresses.ResearchOracle = await researchOracle.getAddress();
  blockNumbers.ResearchOracle = await ethers.provider.getBlockNumber();
  console.log("   ✅ ResearchOracle:", addresses.ResearchOracle);
  console.log("");

  // ============ 4. Deploy ConsentRegistry ============
  console.log("4️⃣  Deploying ConsentRegistry...");
  const ConsentRegistry = await ethers.getContractFactory("ConsentRegistry");
  const consentRegistry = await ConsentRegistry.deploy(worldIdVerifier);
  await consentRegistry.waitForDeployment();
  addresses.ConsentRegistry = await consentRegistry.getAddress();
  blockNumbers.ConsentRegistry = await ethers.provider.getBlockNumber();
  console.log("   ✅ ConsentRegistry:", addresses.ConsentRegistry);
  console.log("   World ID Mode: Demo (verifier = address(0))");
  console.log("");

  // ============ 5. Deploy VerificationRegistry ============
  console.log("5️⃣  Deploying VerificationRegistry...");
  const VerificationRegistry = await ethers.getContractFactory("VerificationRegistry");
  const verificationRegistry = await VerificationRegistry.deploy();
  await verificationRegistry.waitForDeployment();
  addresses.VerificationRegistry = await verificationRegistry.getAddress();
  blockNumbers.VerificationRegistry = await ethers.provider.getBlockNumber();
  console.log("   ✅ VerificationRegistry:", addresses.VerificationRegistry);
  console.log("");

  // ============ Setup Permissions ============
  console.log("🔐 Setting up contract permissions...");
  
  try {
    // Authorize ResearchOracle in DataRegistry
    console.log("   → Authorizing ResearchOracle in DataRegistry...");
    const authTx1 = await dataRegistry.authorizeOracle(addresses.ResearchOracle);
    await authTx1.wait();
    console.log("     ✅ Done");

    // Authorize ResearchOracle in PaymentProcessor
    console.log("   → Authorizing ResearchOracle in PaymentProcessor...");
    const authTx2 = await paymentProcessor.authorizeOracle(addresses.ResearchOracle);
    await authTx2.wait();
    console.log("     ✅ Done");

  } catch (error) {
    console.warn("   ⚠️  Warning: Permission setup had issues:", error.message);
  }

  console.log("");

  // ============ Deployment Summary ============
  const deploymentDuration = ((Date.now() - deploymentStartTime) / 1000).toFixed(2);
  
  console.log("=".repeat(70));
  console.log("📋 DEPLOYMENT COMPLETE - ALL CONTRACTS");
  console.log("=".repeat(70));
  console.log(`
Network:              ${hre.network.name}
Chain ID:             ${networkInfo.chainId}
Deployer:             ${deployer.address}
Duration:             ${deploymentDuration}s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 CONTRACT ADDRESSES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DataRegistry:          ${addresses.DataRegistry}
PaymentProcessor:      ${addresses.PaymentProcessor}
ResearchOracle:        ${addresses.ResearchOracle}
ConsentRegistry:       ${addresses.ConsentRegistry}
VerificationRegistry:  ${addresses.VerificationRegistry}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️  CONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Query Fee:             ${ethers.formatEther(queryFee)} ETH
Individual Query Fee:  ${ethers.formatEther(individualQueryFee)} ETH
Platform Wallet:       ${platformWallet}
World ID Mode:         Demo (no verification required)
`);

  // ============ Save Deployment Info ============
  const deploymentInfo = {
    network: hre.network.name,
    chainId: Number(networkInfo.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    deploymentDuration: `${deploymentDuration}s`,
    contracts: {
      DataRegistry: {
        address: addresses.DataRegistry,
        blockNumber: blockNumbers.DataRegistry,
      },
      PaymentProcessor: {
        address: addresses.PaymentProcessor,
        blockNumber: blockNumbers.PaymentProcessor,
      },
      ResearchOracle: {
        address: addresses.ResearchOracle,
        blockNumber: blockNumbers.ResearchOracle,
      },
      ConsentRegistry: {
        address: addresses.ConsentRegistry,
        blockNumber: blockNumbers.ConsentRegistry,
        worldIdVerifier: worldIdVerifier,
      },
      VerificationRegistry: {
        address: addresses.VerificationRegistry,
        blockNumber: blockNumbers.VerificationRegistry,
      },
    },
    configuration: {
      queryFee: queryFee.toString(),
      queryFeeETH: ethers.formatEther(queryFee),
      individualQueryFee: individualQueryFee.toString(),
      individualQueryFeeETH: ethers.formatEther(individualQueryFee),
      platformWallet: platformWallet,
    },
  };

  // Save deployment file
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = path.join(deploymentsDir, `all-contracts-${timestamp}.json`);
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Deployment info saved to: ${filename}`);

  // Also save as latest
  const latestFilename = path.join(deploymentsDir, "sepolia-latest.json");
  fs.writeFileSync(latestFilename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Latest deployment saved to: sepolia-latest.json`);

  // ============ Generate Frontend .env.local ============
  const envContent = `# BioMesh Frontend Environment Variables
# Generated: ${new Date().toISOString()}
# Network: Sepolia Testnet

# ============ Contract Addresses (Sepolia) ============
NEXT_PUBLIC_DATA_REGISTRY_ADDRESS=${addresses.DataRegistry}
NEXT_PUBLIC_PAYMENT_PROCESSOR_ADDRESS=${addresses.PaymentProcessor}
NEXT_PUBLIC_RESEARCH_ORACLE_ADDRESS=${addresses.ResearchOracle}
NEXT_PUBLIC_CONSENT_REGISTRY_ADDRESS=${addresses.ConsentRegistry}
NEXT_PUBLIC_VERIFICATION_REGISTRY_ADDRESS=${addresses.VerificationRegistry}

# ============ Network Configuration ============
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# ============ FHE Mode Configuration ============
NEXT_PUBLIC_USE_REAL_FHE=true
NEXT_PUBLIC_USE_PRODUCTION_ABI=true

# ============ AI Document Verification ============
# For document verification, set ONE of these API keys:
# OPENAI_API_KEY=sk-your-key-here
# ANTHROPIC_API_KEY=sk-ant-your-key-here

# ============ Optional: WalletConnect ============
# NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
`;

  const frontendEnvPath = path.join(__dirname, "../../frontend/.env.local");
  fs.writeFileSync(frontendEnvPath, envContent);
  console.log(`\n📄 Frontend .env.local updated at: ${frontendEnvPath}`);

  console.log("\n" + "=".repeat(70));
  console.log("✅ ALL CONTRACTS DEPLOYED SUCCESSFULLY!");
  console.log("=".repeat(70));
  console.log("\nNext steps:");
  console.log("1. Restart your frontend dev server: cd frontend && npm run dev");
  console.log("2. Connect your wallet and test the consent forms");
  console.log("3. Submit patient data and execute queries\n");

  return { addresses, deploymentInfo };
}

// Execute
main()
  .then(() => {
    console.log("Deployment script finished.\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

module.exports = { main };
