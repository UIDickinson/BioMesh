const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying ConsentRegistry to Sepolia...\n");

  // ============ Environment Validation ============
  if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY not set in environment variables.");
  }

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  if (ethers.parseEther("0.1") > balance) {
    throw new Error("❌ Insufficient balance. You need at least 0.1 ETH to deploy.");
  }
  
  const networkInfo = await ethers.provider.getNetwork();
  console.log("🌐 Network:", hre.network.name);
  console.log("🔗 Chain ID:", networkInfo.chainId);
  console.log("");

  // ============ Deploy ConsentRegistry ============
  console.log("📜 Deploying ConsentRegistry...");
  
  // World ID verifier address - use address(0) for demo/testnet mode
  // In production, this would be the actual Worldcoin verifier contract
  const worldIdVerifier = ethers.ZeroAddress; // Demo mode
  
  const ConsentRegistry = await ethers.getContractFactory("ConsentRegistry");
  const consentRegistry = await ConsentRegistry.deploy(worldIdVerifier);
  await consentRegistry.waitForDeployment();
  
  const consentRegistryAddress = await consentRegistry.getAddress();
  const blockNumber = await ethers.provider.getBlockNumber();
  
  console.log("✅ ConsentRegistry deployed to:", consentRegistryAddress);
  console.log("   Block:", blockNumber);
  console.log("   World ID Verifier:", worldIdVerifier, "(demo mode)");
  console.log("");

  // ============ Save Deployment Info ============
  const deploymentInfo = {
    network: hre.network.name,
    chainId: Number(networkInfo.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ConsentRegistry: {
        address: consentRegistryAddress,
        blockNumber: blockNumber,
        worldIdVerifier: worldIdVerifier,
        type: "Consent & World ID Verification"
      }
    },
    blockExplorer: {
      baseUrl: "https://sepolia.etherscan.io",
      ConsentRegistry: `https://sepolia.etherscan.io/address/${consentRegistryAddress}`
    }
  };

  // Save to file
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `consent-registry-${hre.network.name}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  console.log("📁 Deployment info saved to:", filename);

  // Also update env template
  console.log("\n============ Update Your .env.local ============");
  console.log(`NEXT_PUBLIC_CONSENT_REGISTRY_ADDRESS=${consentRegistryAddress}`);
  console.log("================================================\n");

  // ============ Verify Contract ============
  if (process.env.ETHERSCAN_API_KEY && hre.network.name === "sepolia") {
    console.log("⏳ Waiting for block confirmations before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

    console.log("🔍 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: consentRegistryAddress,
        constructorArguments: [worldIdVerifier],
      });
      console.log("✅ Contract verified on Etherscan!");
    } catch (error) {
      console.log("⚠️  Verification failed:", error.message);
    }
  }

  console.log("🎉 ConsentRegistry deployment complete!");
  console.log("\nNext steps:");
  console.log("1. Add NEXT_PUBLIC_CONSENT_REGISTRY_ADDRESS to frontend/.env.local");
  console.log("2. Restart the frontend dev server");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
