'use client';

import { ethers } from 'ethers';

/**
 * BioMesh FHE Encryption Module
 * 
 * This module handles encryption of health data using Zama's FHEVM.
 * 
 * IMPORTANT: This flag MUST match USE_PRODUCTION_ABI in contracts.js
 * - false: Mock mode (for contracts deployed with mock TFHE library)
 * - true: Production mode (for contracts deployed with @fhevm/solidity)
 * 
 * To switch to production:
 * 1. Deploy contracts with real @fhevm/solidity package
 * 2. Set USE_REAL_FHE = true here
 * 3. Set USE_PRODUCTION_ABI = true in contracts.js
 * 4. Update contract addresses in .env.local
 */
const USE_REAL_FHE = false;

// Export mode for other modules to check
export const isRealFHEMode = () => USE_REAL_FHE;

let fhevmInstance = null;
let initPromise = null;
let initError = null;

// Initialize the FHEVM instance using the new relayer SDK with official SepoliaConfig
const initFhevmInstance = async () => {
  // Return cached error if initialization already failed
  if (initError) {
    throw initError;
  }
  
  if (!USE_REAL_FHE) {
    console.log('⚠️ Running in MOCK FHE mode - encryption is simulated');
    console.log('   Data will NOT be encrypted on-chain!');
    console.log('   This is safe for testing with mock TFHE contracts.');
    return { mock: true };
  }
  
  if (initPromise) return initPromise;
  
  if (typeof window === 'undefined') {
    throw new Error('FHE operations require browser environment');
  }

  initPromise = (async () => {
    try {
      console.log('📦 Importing @zama-fhe/relayer-sdk/web...');
      
      // Dynamic import at runtime - webpack won't bundle the WASM this way
      const relayerSDK = await import('@zama-fhe/relayer-sdk/web');
      const { initSDK, createInstance, SepoliaConfig } = relayerSDK;
      
      console.log('✅ Relayer SDK imported');
      console.log('   SDK exports:', Object.keys(relayerSDK).join(', '));
      
      // Initialize the SDK first (loads WASM modules)
      console.log('🔧 Initializing SDK (loading WASM)...');
      await initSDK();
      console.log('✅ SDK initialized');
      
      console.log('📋 Using official SepoliaConfig');
      console.log('   Chain ID:', SepoliaConfig?.chainId);
      
      // Use the wallet provider if available
      if (!window.ethereum) {
        throw new Error('No wallet provider (window.ethereum) found. Please connect your wallet.');
      }
      
      console.log('🔗 Using provider: window.ethereum');
      
      // Create FHEVM instance with official SepoliaConfig
      // The SDK already knows the correct relayer URL - don't override it
      const instance = await createInstance({
        ...SepoliaConfig,
        network: window.ethereum, // Pass the wallet provider
      });
      
      console.log('✅ FHEVM instance created successfully');
      return instance;
    } catch (error) {
      console.error('❌ Failed to initialize FHEVM:', error);
      console.error('Error stack:', error.stack);
      initPromise = null;
      initError = error; // Cache the error
      throw error;
    }
  })();

  return initPromise;
};

export async function getFHEInstance() {
  if (fhevmInstance) return fhevmInstance;
  
  try {
    fhevmInstance = await initFhevmInstance();
    return fhevmInstance;
  } catch (error) {
    console.error('❌ Failed to get FHE instance:', error);
    fhevmInstance = null;
    throw error;
  }
}

// Reset the FHE instance (useful for testing or after wallet disconnect)
export function resetFHEInstance() {
  fhevmInstance = null;
  initPromise = null;
  initError = null;
}

// Helper to create a mock bytes32 handle from a value
function createMockHandle(value, index) {
  // Create a bytes32 that encodes the value in a format the mock contract expects
  // The mock contract's einput is uint256, so we pad the value to 32 bytes
  const bigValue = BigInt(value);
  const hex = ethers.zeroPadValue(ethers.toBeHex(bigValue), 32);
  console.log(`  Mock Handle[${index}]: ${hex} (value: ${value})`);
  return hex;
}

// Validate health data before encryption
function validateHealthData(data) {
  const errors = [];
  
  const age = parseInt(data.age || 0);
  if (age < 1 || age > 120) {
    errors.push(`Age must be between 1 and 120 (got: ${age})`);
  }
  
  const diagnosis = parseInt(data.diagnosis || 0);
  if (diagnosis < 0) {
    errors.push(`Diagnosis code must be non-negative (got: ${diagnosis})`);
  }
  
  const outcome = parseInt(data.outcome || 0);
  if (outcome < 0 || outcome > 100) {
    errors.push(`Outcome must be between 0 and 100 (got: ${outcome})`);
  }
  
  const biomarker = BigInt(data.biomarker || 0);
  if (biomarker < 0n) {
    errors.push(`Biomarker must be non-negative`);
  }
  
  if (errors.length > 0) {
    throw new Error(`Validation failed:\n- ${errors.join('\n- ')}`);
  }
  
  return { age, diagnosis, outcome, biomarker };
}

export async function encryptHealthData(contractAddress, userAddress, data) {
  // Validate inputs
  if (!contractAddress || !ethers.isAddress(contractAddress)) {
    throw new Error(`Invalid contract address: ${contractAddress}`);
  }
  if (!userAddress || !ethers.isAddress(userAddress)) {
    throw new Error(`Invalid user address: ${userAddress}`);
  }
  
  // Validate and parse health data
  const { age, diagnosis, outcome, biomarker } = validateHealthData(data);
  
  const instance = await getFHEInstance();
  
  // Mock mode - create fake handles that the mock contract can process
  if (!USE_REAL_FHE || instance?.mock) {
    console.log('🔐 Creating MOCK encrypted input for health data...');
    console.log('📍 Contract:', contractAddress);
    console.log('👤 User:', userAddress);
    console.log('📊 Data:', { age, diagnosis, outcome, biomarker: biomarker.toString() });
    console.log('⚠️ WARNING: Using mock encryption - data is NOT actually encrypted!');
    
    // Create mock handles (just the values padded to bytes32)
    const handles = [
      createMockHandle(age, 0),
      createMockHandle(diagnosis, 1),
      createMockHandle(outcome, 2),
      createMockHandle(biomarker, 3),
    ];
    
    // Create a mock proof (empty bytes is fine for mock contract)
    const inputProof = '0x';
    
    console.log('✅ Mock encryption complete');
    console.log('📦 Handles:', handles.map(h => h.slice(0, 20) + '...'));
    
    return {
      handles,
      inputProof,
    };
  }
  
  // Real FHE mode
  try {
    console.log('🔐 Creating REAL encrypted input for health data...');
    console.log('📍 Contract:', contractAddress);
    console.log('👤 User:', userAddress);
    console.log('📊 Data:', { age, diagnosis, outcome, biomarker: biomarker.toString() });
    
    const input = instance.createEncryptedInput(contractAddress, userAddress);
    
    // Add encrypted fields matching the smart contract
    // Order matters: age, diagnosis, outcome, biomarker
    input.add32(age);
    input.add32(diagnosis);
    input.add32(outcome);
    input.add64(biomarker);
    
    console.log('🔒 Encrypting input...');
    const encryptedData = await input.encrypt();
    
    console.log('✅ Encryption successful');
    console.log('📊 Raw encrypted data structure:', {
      handlesCount: encryptedData.handles?.length,
      handleTypes: encryptedData.handles?.map(h => typeof h),
      handleLengths: encryptedData.handles?.map(h => h?.length || h?.byteLength),
      inputProofType: typeof encryptedData.inputProof,
      inputProofLength: encryptedData.inputProof?.length || encryptedData.inputProof?.byteLength
    });
    
    // Convert handles to proper hex format for bytes32
    const handles = encryptedData.handles.map((handle, i) => {
      let hex;
      
      if (handle instanceof Uint8Array) {
        hex = '0x' + Array.from(handle).map(b => b.toString(16).padStart(2, '0')).join('');
      } else if (typeof handle === 'string') {
        hex = handle.startsWith('0x') ? handle : '0x' + handle;
      } else if (ArrayBuffer.isView(handle)) {
        hex = '0x' + Array.from(new Uint8Array(handle.buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        hex = '0x' + String(handle);
      }
      
      console.log(`  Handle[${i}] length: ${hex.length} chars, value: ${hex.slice(0, 40)}...`);
      
      // Ensure proper bytes32 length
      if (hex.length < 66) {
        hex = hex.padEnd(66, '0');
      }
      
      return hex;
    });
    
    // Convert inputProof to hex
    let inputProof = encryptedData.inputProof;
    if (inputProof instanceof Uint8Array) {
      inputProof = '0x' + Array.from(inputProof).map(b => b.toString(16).padStart(2, '0')).join('');
    } else if (typeof inputProof === 'string' && !inputProof.startsWith('0x')) {
      inputProof = '0x' + inputProof;
    }
    console.log(`  InputProof length: ${inputProof?.length} chars, value: ${inputProof?.slice(0, 60)}...`);
    
    return {
      handles,
      inputProof,
    };
  } catch (error) {
    console.error('❌ Encryption failed:', error);
    throw error;
  }
}