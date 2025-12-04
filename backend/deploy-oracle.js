const { ethers } = require('ethers');
const fs = require('fs');

async function main() {
  // Load private key
  const envContent = fs.readFileSync('.env').toString();
  const privateKey = envContent.match(/PRIVATE_KEY=(\S+)/)?.[1];
  if (!privateKey) {
    console.error('No private key found');
    process.exit(1);
  }

  // Connect to Sepolia using Alchemy public endpoint
  const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log('Deploying from:', wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');

  // Load contract artifact
  const artifact = JSON.parse(fs.readFileSync('./artifacts/contracts/ResearchOracle.sol/ResearchOracle.json'));
  
  // Existing contract addresses
  const dataRegistry = '0xd51ca70ce024f2fdB1bC02692549C819da5407A2';
  const paymentProcessor = '0x17560A4F6D5783D6057A042A72B7BE4093DD8714';
  const queryFee = ethers.parseEther('0.001');

  console.log('\nDeploying ResearchOracle with:');
  console.log('  DataRegistry:', dataRegistry);
  console.log('  PaymentProcessor:', paymentProcessor);
  console.log('  Query Fee:', ethers.formatEther(queryFee), 'ETH');

  // Deploy
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(dataRegistry, paymentProcessor, queryFee);
  
  console.log('\nTransaction sent:', contract.deploymentTransaction().hash);
  console.log('Waiting for confirmation...');
  
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  
  console.log('\n✅ ResearchOracle deployed to:', address);
  
  // Update deployment file
  const deploymentPath = './deployments/sepolia-manual.json';
  let deployment = {};
  if (fs.existsSync(deploymentPath)) {
    deployment = JSON.parse(fs.readFileSync(deploymentPath));
  }
  deployment.ResearchOracle = address;
  deployment.timestamp = new Date().toISOString();
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log('Updated deployments/sepolia-manual.json');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
