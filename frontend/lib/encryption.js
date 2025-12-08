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
 * 2. Set NEXT_PUBLIC_USE_REAL_FHE=true in .env.local
 * 3. Set NEXT_PUBLIC_USE_PRODUCTION_ABI=true in .env.local
 * 4. Update contract addresses in .env.local
 */
const USE_REAL_FHE = process.env.NEXT_PUBLIC_USE_REAL_FHE === 'true';

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

// Sentinel values for null/not-provided fields
// These MUST match the contract constants
export const NULL_UINT32 = 0xFFFFFFFF; // type(uint32).max = 4294967295
export const NULL_UINT16 = 0xFFFF;     // type(uint16).max = 65535
export const NULL_UINT8 = 0xFF;         // type(uint8).max = 255

// Gender mapping
export const GENDER_MAP = {
  'male': 0,
  'female': 1,
  'other': 2,
  'm': 0,
  'f': 1,
  '': NULL_UINT8,
  null: NULL_UINT8,
  undefined: NULL_UINT8
};

// Ethnicity mapping (NIH categories)
export const ETHNICITY_MAP = {
  'american_indian': 1,
  'asian': 2,
  'black': 3,
  'hispanic': 4,
  'pacific_islander': 5,
  'white': 6,
  'multiracial': 7,
  'other': 7,
  'prefer_not_to_say': NULL_UINT8,
  '': NULL_UINT8,
  null: NULL_UINT8,
  undefined: NULL_UINT8
};

// Helper to create a mock bytes32 handle from a value
function createMockHandle(value, index, bitSize = 32) {
  // Create a bytes32 that encodes the value in a format the mock contract expects
  const bigValue = BigInt(value);
  const hex = ethers.zeroPadValue(ethers.toBeHex(bigValue), 32);
  console.log(`  Mock Handle[${index}]: ${hex} (value: ${value}, bits: ${bitSize})`);
  return hex;
}

// Parse value with null handling
function parseWithNull(value, nullSentinel, min = 0, max = Infinity, parser = parseInt) {
  if (value === '' || value === null || value === undefined) {
    return nullSentinel;
  }
  const parsed = parser(value);
  if (isNaN(parsed)) {
    return nullSentinel;
  }
  // If out of range, return null
  if (parsed < min || parsed > max) {
    console.warn(`Value ${parsed} out of range [${min}-${max}], treating as null`);
    return nullSentinel;
  }
  return parsed;
}

// Validate health data before encryption (expanded with null handling)
function validateHealthData(data) {
  const errors = [];
  
  // Required fields (must be provided)
  const diagnosis = parseInt(data.diagnosis || 0);
  if (diagnosis < 0 || isNaN(diagnosis)) {
    errors.push(`Diagnosis code is required and must be non-negative (got: ${data.diagnosis})`);
  }
  
  const biomarker = BigInt(data.biomarker || 0);
  if (biomarker < 0n) {
    errors.push(`Biomarker is required and must be non-negative`);
  }
  
  // Age: required but validated with range (1-120)
  const age = parseWithNull(data.age, NULL_UINT32, 1, 120);
  if (age === NULL_UINT32 && data.age !== '' && data.age !== null && data.age !== undefined) {
    // They provided a value but it's invalid
    errors.push(`Age must be between 1 and 120 (got: ${data.age})`);
  }
  
  // Gender: optional, map string to code
  const genderInput = (data.gender || '').toLowerCase().trim();
  const gender = GENDER_MAP[genderInput] ?? NULL_UINT8;
  
  // Ethnicity: optional, map string to code
  const ethnicityInput = (data.ethnicity || '').toLowerCase().trim().replace(/\s+/g, '_');
  const ethnicity = ETHNICITY_MAP[ethnicityInput] ?? NULL_UINT8;
  
  // Outcome: optional (0-100)
  const outcome = parseWithNull(data.outcome, NULL_UINT32, 0, 100);
  
  // BMI: optional, stored as x10 (e.g., 24.5 → 245)
  let bmi = NULL_UINT16;
  if (data.bmi !== '' && data.bmi !== null && data.bmi !== undefined) {
    const bmiFloat = parseFloat(data.bmi);
    if (!isNaN(bmiFloat) && bmiFloat >= 10 && bmiFloat <= 100) {
      bmi = Math.round(bmiFloat * 10); // Store as integer x10
    }
  }
  
  // Blood pressure: optional
  const systolicBP = parseWithNull(data.systolicBP, NULL_UINT16, 60, 250);
  const diastolicBP = parseWithNull(data.diastolicBP, NULL_UINT16, 40, 150);
  
  if (errors.length > 0) {
    throw new Error(`Validation failed:\n- ${errors.join('\n- ')}`);
  }
  
  return { 
    age, 
    gender, 
    ethnicity,
    diagnosis, 
    outcome, 
    biomarker,
    bmi,
    systolicBP,
    diastolicBP
  };
}

export async function encryptHealthData(contractAddress, userAddress, data) {
  // Validate inputs
  if (!contractAddress || !ethers.isAddress(contractAddress)) {
    throw new Error(`Invalid contract address: ${contractAddress}`);
  }
  if (!userAddress || !ethers.isAddress(userAddress)) {
    throw new Error(`Invalid user address: ${userAddress}`);
  }
  
  // Validate and parse health data (with null handling)
  const { 
    age, gender, ethnicity, diagnosis, outcome, biomarker, bmi, systolicBP, diastolicBP 
  } = validateHealthData(data);
  
  const instance = await getFHEInstance();
  
  // Mock mode - create fake handles that the mock contract can process
  if (!USE_REAL_FHE || instance?.mock) {
    console.log('🔐 Creating MOCK encrypted input for health data...');
    console.log('📍 Contract:', contractAddress);
    console.log('👤 User:', userAddress);
    console.log('📊 Data (with null handling):', { 
      age: age === NULL_UINT32 ? 'NULL' : age,
      gender: gender === NULL_UINT8 ? 'NULL' : gender,
      ethnicity: ethnicity === NULL_UINT8 ? 'NULL' : ethnicity,
      diagnosis,
      outcome: outcome === NULL_UINT32 ? 'NULL' : outcome,
      biomarker: biomarker.toString(),
      bmi: bmi === NULL_UINT16 ? 'NULL' : bmi,
      systolicBP: systolicBP === NULL_UINT16 ? 'NULL' : systolicBP,
      diastolicBP: diastolicBP === NULL_UINT16 ? 'NULL' : diastolicBP
    });
    console.log('⚠️ WARNING: Using mock encryption - data is NOT actually encrypted!');
    
    // Create mock handles for all 9 fields
    // Order matters: age, gender, ethnicity, diagnosis, outcome, biomarker, bmi, systolicBP, diastolicBP
    const handles = [
      createMockHandle(age, 0, 32),           // euint32
      createMockHandle(gender, 1, 8),          // euint8
      createMockHandle(ethnicity, 2, 8),       // euint8
      createMockHandle(diagnosis, 3, 32),      // euint32
      createMockHandle(outcome, 4, 32),        // euint32
      createMockHandle(biomarker, 5, 64),      // euint64
      createMockHandle(bmi, 6, 16),            // euint16
      createMockHandle(systolicBP, 7, 16),     // euint16
      createMockHandle(diastolicBP, 8, 16),    // euint16
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
    console.log('📊 Data (with null handling):', { 
      age: age === NULL_UINT32 ? 'NULL' : age,
      gender: gender === NULL_UINT8 ? 'NULL' : gender,
      ethnicity: ethnicity === NULL_UINT8 ? 'NULL' : ethnicity,
      diagnosis,
      outcome: outcome === NULL_UINT32 ? 'NULL' : outcome,
      biomarker: biomarker.toString(),
      bmi: bmi === NULL_UINT16 ? 'NULL' : bmi,
      systolicBP: systolicBP === NULL_UINT16 ? 'NULL' : systolicBP,
      diastolicBP: diastolicBP === NULL_UINT16 ? 'NULL' : diastolicBP
    });
    
    const input = instance.createEncryptedInput(contractAddress, userAddress);
    
    // Add encrypted fields matching the smart contract signature order:
    // age (32), gender (8), ethnicity (8), diagnosis (32), outcome (32), 
    // biomarker (64), bmi (16), systolicBP (16), diastolicBP (16)
    input.add32(age);
    input.add8(gender);
    input.add8(ethnicity);
    input.add32(diagnosis);
    input.add32(outcome);
    input.add64(biomarker);
    input.add16(bmi);
    input.add16(systolicBP);
    input.add16(diastolicBP);
    
    console.log('🔒 Encrypting 9 fields...');
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