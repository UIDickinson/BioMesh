/**
 * Update consent level for existing records in DataRegistry
 * Usage: npx hardhat run scripts/update-record-consent.js --network sepolia
 * 
 * This script updates records to allow individual access (consent level 1)
 */

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  // Load deployment info
  const deploymentPath = path.join(__dirname, '../deployments/sepolia-latest.json');
  if (!fs.existsSync(deploymentPath)) {
    console.error('❌ No deployment file found. Deploy contracts first.');
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
  const dataRegistryAddress = deployment.contracts?.DataRegistry?.address || deployment.DataRegistry;

  if (!dataRegistryAddress) {
    console.error('❌ DataRegistry address not found in deployment');
    process.exit(1);
  }

  console.log('📋 DataRegistry address:', dataRegistryAddress);

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log('👤 Signer address:', signer.address);

  // Get contract
  const DataRegistry = await ethers.getContractFactory('DataRegistry');
  const dataRegistry = DataRegistry.attach(dataRegistryAddress);

  // Get record count
  const recordCount = await dataRegistry.recordCount();
  console.log(`📊 Total records: ${recordCount}`);

  if (recordCount === 0n) {
    console.log('No records to update');
    return;
  }

  // Check each record and update consent if needed
  for (let i = 0; i < recordCount; i++) {
    try {
      const record = await dataRegistry.records(i);
      const patient = record.patient;
      const isActive = record.isActive;
      
      console.log(`\nRecord ${i}:`);
      console.log(`  Patient: ${patient}`);
      console.log(`  Active: ${isActive}`);

      if (!isActive) {
        console.log('  ⏭️ Skipping inactive record');
        continue;
      }

      // Check current consent
      const currentConsent = await dataRegistry.getConsentLevel(i);
      console.log(`  Current consent: ${currentConsent} (${currentConsent === 0n ? 'Aggregate Only' : 'Individual Allowed'})`);

      // If already individual allowed, skip
      if (currentConsent === 1n) {
        console.log('  ✅ Already allows individual access');
        continue;
      }

      // Check if we're the owner
      if (patient.toLowerCase() !== signer.address.toLowerCase()) {
        console.log(`  ⚠️ Not the owner of this record (owner: ${patient})`);
        continue;
      }

      // Update consent to individual allowed
      console.log('  📝 Updating consent to Individual Allowed...');
      const tx = await dataRegistry.setConsent(i, 1);
      console.log(`  📤 Transaction: ${tx.hash}`);
      await tx.wait();
      console.log('  ✅ Consent updated successfully!');

    } catch (err) {
      console.error(`  ❌ Error processing record ${i}:`, err.message);
    }
  }

  console.log('\n🎉 Done!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
