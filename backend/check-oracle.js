const { ethers } = require('ethers');
const fs = require('fs');

async function main() {
  const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
  
  const dataRegistryABI = [
    "function authorizedOracles(address) view returns (bool)",
    "function owner() view returns (address)"
  ];
  
  const dataRegistry = new ethers.Contract(
    '0xd51ca70ce024f2fdB1bC02692549C819da5407A2',
    dataRegistryABI,
    provider
  );
  
  const researchOracle = '0xc279f4C2ec01dd7290646D8A2627e78f6940621b';
  
  console.log('Checking DataRegistry at:', '0xd51ca70ce024f2fdB1bC02692549C819da5407A2');
  console.log('ResearchOracle address:', researchOracle);
  
  const isAuthorized = await dataRegistry.authorizedOracles(researchOracle);
  console.log('\nIs ResearchOracle authorized?', isAuthorized);
  
  const owner = await dataRegistry.owner();
  console.log('DataRegistry owner:', owner);
}

main().catch(console.error);
