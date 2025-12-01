const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Deploying BioMesh contracts...");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy DataRegistry
  const DataRegistry = await hre.ethers.getContractFactory("DataRegistry");
  const dataRegistry = await DataRegistry.deploy();
  await dataRegistry.waitForDeployment();
  const dataRegistryAddress = await dataRegistry.getAddress();
  console.log("DataRegistry deployed:", dataRegistryAddress);

  // Deploy PaymentProcessor
  const platformWallet = deployer.address; // Use deployer as platform wallet
  const PaymentProcessor = await hre.ethers.getContractFactory("PaymentProcessor");
  const paymentProcessor = await PaymentProcessor.deploy(
    dataRegistryAddress,
    platformWallet
  );
  await paymentProcessor.waitForDeployment();
  const paymentProcessorAddress = await paymentProcessor.getAddress();
  console.log("PaymentProcessor deployed:", paymentProcessorAddress);

  // Deploy ResearchOracle
  const queryFee = hre.ethers.parseEther("0.01");
  const ResearchOracle = await hre.ethers.getContractFactory("ResearchOracle");
  const researchOracle = await ResearchOracle.deploy(
    dataRegistryAddress,
    paymentProcessorAddress,
    queryFee
  );
  await researchOracle.waitForDeployment();
  const researchOracleAddress = await researchOracle.getAddress();
  console.log("ResearchOracle deployed:", researchOracleAddress);

  // Setup permissions
  console.log("\nSetting up permissions...");
  await dataRegistry.authorizeOracle(researchOracleAddress);
  await paymentProcessor.authorizeOracle(researchOracleAddress);
  console.log("Permissions configured!");

  console.log("\nAll contracts deployed and configured!");
  console.log("\nContract Addresses:");
  console.log("- DataRegistry:", dataRegistryAddress);
  console.log("- PaymentProcessor:", paymentProcessorAddress);
  console.log("- ResearchOracle:", researchOracleAddress);

  // Save deployment info to file
  const network = await hre.ethers.provider.getNetwork();
  const deploymentInfo = {
    network: hre.network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      DataRegistry: dataRegistryAddress,
      PaymentProcessor: paymentProcessorAddress,
      ResearchOracle: researchOracleAddress,
    },
    configuration: {
      queryFee: queryFee.toString(),
      platformWallet: platformWallet,
    },
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = "./deployments";
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  // Save deployment info
  const filename = `${deploymentsDir}/${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to: ${filename}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});