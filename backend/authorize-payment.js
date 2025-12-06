const { ethers } = require('ethers');
const fs = require('fs');

async function main() {
  const envContent = fs.readFileSync('.env').toString();
  const privateKey = envContent.match(/PRIVATE_KEY=(\S+)/)?.[1];
  
  const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log('Authorizing from wallet:', wallet.address);
  
  const paymentProcessorABI = [
    "function authorizeOracle(address oracle) external",
    "function authorizedOracles(address) view returns (bool)"
  ];
  
  const paymentProcessor = new ethers.Contract(
    '0x17560A4F6D5783D6057A042A72B7BE4093DD8714',
    paymentProcessorABI,
    wallet
  );
  
  const researchOracle = '0xc279f4C2ec01dd7290646D8A2627e78f6940621b';
  
  // Check if already authorized
  const isAlreadyAuth = await paymentProcessor.authorizedOracles(researchOracle);
  if (isAlreadyAuth) {
    console.log('✅ ResearchOracle already authorized in PaymentProcessor');
    return;
  }
  
  console.log('\nAuthorizing ResearchOracle in PaymentProcessor:', researchOracle);
  
  const tx = await paymentProcessor.authorizeOracle(researchOracle);
  console.log('Transaction sent:', tx.hash);
  await tx.wait();
  console.log('✅ Transaction confirmed!');
  
  const isAuthorized = await paymentProcessor.authorizedOracles(researchOracle);
  console.log('Verification - Is authorized?', isAuthorized);
}

main().catch(console.error);
