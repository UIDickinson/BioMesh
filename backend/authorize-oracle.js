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

  const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log('Authorizing from wallet:', wallet.address);
  
  const dataRegistryABI = [
    "function authorizeOracle(address oracle) external",
    "function authorizedOracles(address) view returns (bool)"
  ];
  
  const dataRegistry = new ethers.Contract(
    '0xd51ca70ce024f2fdB1bC02692549C819da5407A2',
    dataRegistryABI,
    wallet
  );
  
  const researchOracle = '0xc279f4C2ec01dd7290646D8A2627e78f6940621b';
  
  console.log('\nAuthorizing ResearchOracle:', researchOracle);
  
  const tx = await dataRegistry.authorizeOracle(researchOracle);
  console.log('Transaction sent:', tx.hash);
  console.log('Waiting for confirmation...');
  
  await tx.wait();
  console.log('✅ Transaction confirmed!');
  
  // Verify
  const isAuthorized = await dataRegistry.authorizedOracles(researchOracle);
  console.log('\nVerification - Is ResearchOracle authorized?', isAuthorized);
}

main().catch(console.error);
