'use client';

/**
 * useUserDecryption Hook
 * 
 * React hook for FHE User Decryption via @zama-fhe/relayer-sdk
 * - Instant decryption (2-5 seconds vs 5+ hours with Gateway)
 * - Signature caching (user signs once, valid for 365 days)
 * - 90% success rate on Sepolia testnet
 * 
 * Supports decryption of:
 * - Query results (sum/count for aggregate queries)
 * - Individual health records (all 9 fields for researchers with consent)
 */

import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider, ethers } from 'ethers';
import { CONTRACTS } from '@/lib/contracts';

// Field type mapping for health records
const HEALTH_FIELD_TYPES = {
  age: 'euint32',
  gender: 'euint8',
  ethnicity: 'euint8',
  diagnosis: 'euint32',
  treatmentOutcome: 'euint32',
  biomarker: 'euint64',
  bmi: 'euint16',
  systolicBP: 'euint16',
  diastolicBP: 'euint16',
};

// Sentinel values for null/not-provided fields (must match contract)
const NULL_UINT32 = 0xFFFFFFFF;
const NULL_UINT16 = 0xFFFF;
const NULL_UINT8 = 0xFF;

// Lazy load the FHE utilities to avoid SSR issues
let fhevmUtils = null;

async function loadFhevmUtils() {
  if (!fhevmUtils) {
    fhevmUtils = await import('@/lib/fhevm-v09');
  }
  return fhevmUtils;
}

/**
 * Hook for FHE User Decryption
 * @param {any} signer - Ethers signer from wallet
 * @returns {object} Decryption utilities and state
 */
export function useUserDecryption(signer) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState(null);

  // Initialize FHE on mount
  useEffect(() => {
    const init = async () => {
      if (!signer) return;
      
      try {
        const utils = await loadFhevmUtils();
        const provider = signer.provider || new BrowserProvider(window.ethereum);
        await utils.initializeFhevm(provider);
        setIsInitialized(true);
        console.log('✅ FHE User Decryption initialized');
      } catch (err) {
        console.error('❌ Failed to initialize FHE:', err);
        setError(err.message);
      }
    };

    init();
  }, [signer]);

  /**
   * Decrypt query results (sum and count)
   * @param {string|bigint} sumHandle - Encrypted sum handle from contract
   * @param {string|bigint} countHandle - Encrypted count handle from contract
   * @returns {Promise<{sum: bigint, count: number, average: number}>}
   */
  const decryptQueryResults = useCallback(async (sumHandle, countHandle) => {
    if (!signer) {
      throw new Error('No signer available');
    }

    setIsDecrypting(true);
    setError(null);

    try {
      const utils = await loadFhevmUtils();
      const provider = signer.provider || new BrowserProvider(window.ethereum);
      const contractAddress = CONTRACTS.ResearchOracle.address;

      // Convert handles to hex strings
      const sumHex = utils.handleToHex(sumHandle);
      const countHex = utils.handleToHex(countHandle);

      console.log('🔓 Decrypting query results...');
      console.log('   Sum handle:', sumHex);
      console.log('   Count handle:', countHex);

      // Batch decrypt both values
      const results = await utils.batchDecrypt(
        provider,
        contractAddress,
        [sumHex, countHex],
        signer
      );

      const sum = BigInt(results[sumHex] || 0);
      const count = Number(results[countHex] || 0);
      const average = count > 0 ? Number(sum / BigInt(count)) : 0;

      console.log('✅ Decryption complete:');
      console.log('   Sum:', sum.toString());
      console.log('   Count:', count);
      console.log('   Average:', average);

      return { sum, count, average };

    } catch (err) {
      console.error('❌ Decryption failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsDecrypting(false);
    }
  }, [signer]);

  /**
   * Decrypt a single euint64 value
   * @param {string|bigint} handle - Encrypted handle
   * @returns {Promise<bigint>} Decrypted value
   */
  const decryptUint64 = useCallback(async (handle) => {
    if (!signer) {
      throw new Error('No signer available');
    }

    setIsDecrypting(true);
    setError(null);

    try {
      const utils = await loadFhevmUtils();
      const provider = signer.provider || new BrowserProvider(window.ethereum);
      const contractAddress = CONTRACTS.ResearchOracle.address;

      const hexHandle = utils.handleToHex(handle);
      const result = await utils.decryptUint64(provider, contractAddress, hexHandle, signer);
      
      return result;
    } catch (err) {
      console.error('❌ Decryption failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsDecrypting(false);
    }
  }, [signer]);

  /**
   * Decrypt a single euint32 value
   * @param {string|bigint} handle - Encrypted handle
   * @returns {Promise<number>} Decrypted value
   */
  const decryptUint32 = useCallback(async (handle) => {
    if (!signer) {
      throw new Error('No signer available');
    }

    setIsDecrypting(true);
    setError(null);

    try {
      const utils = await loadFhevmUtils();
      const provider = signer.provider || new BrowserProvider(window.ethereum);
      const contractAddress = CONTRACTS.ResearchOracle.address;

      const hexHandle = utils.handleToHex(handle);
      const result = await utils.decryptUint32(provider, contractAddress, hexHandle, signer);
      
      return result;
    } catch (err) {
      console.error('❌ Decryption failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsDecrypting(false);
    }
  }, [signer]);

  /**
   * Decrypt individual health record fields for a researcher
   * This is the main function for decrypting all 9 encrypted fields
   * 
   * @param {object} encryptedRecord - Object with encrypted handles for each field
   *   Expected format from DataRegistry.getRecord():
   *   { age, gender, ethnicity, diagnosis, treatmentOutcome, biomarker, bmi, systolicBP, diastolicBP }
   * @returns {Promise<object>} Decrypted health record
   */
  const decryptHealthRecord = useCallback(async (encryptedRecord) => {
    if (!signer) {
      throw new Error('No signer available');
    }

    setIsDecrypting(true);
    setError(null);

    try {
      const utils = await loadFhevmUtils();
      const provider = signer.provider || new BrowserProvider(window.ethereum);
      // Use DataRegistry for individual records
      const contractAddress = CONTRACTS.DataRegistry.address;

      console.log('🔓 Decrypting health record (9 fields)...');
      console.log('📍 Contract:', contractAddress);

      // Convert all handles to hex format
      const handles = [];
      const fieldOrder = ['age', 'gender', 'ethnicity', 'diagnosis', 'treatmentOutcome', 'biomarker', 'bmi', 'systolicBP', 'diastolicBP'];
      
      for (const field of fieldOrder) {
        if (encryptedRecord[field]) {
          const handle = utils.handleToHex(encryptedRecord[field]);
          handles.push(handle);
          console.log(`   ${field} handle:`, handle.slice(0, 20) + '...');
        } else {
          handles.push(null);
          console.log(`   ${field}: not provided`);
        }
      }

      // Filter out null handles for batch decrypt
      const validHandles = handles.filter(h => h !== null);
      
      if (validHandles.length === 0) {
        console.warn('⚠️ No valid handles to decrypt');
        return null;
      }

      console.log(`🔓 Batch decrypting ${validHandles.length} fields...`);
      
      // Batch decrypt all fields at once
      const decryptedMap = await utils.batchDecrypt(
        provider,
        contractAddress,
        validHandles,
        signer
      );

      console.log('✅ Decryption complete, mapping values...');

      // Map decrypted values back to fields
      const decryptedRecord = {};
      let handleIndex = 0;

      for (let i = 0; i < fieldOrder.length; i++) {
        const field = fieldOrder[i];
        const handle = handles[i];
        
        if (handle === null) {
          decryptedRecord[field] = null;
          continue;
        }

        const rawValue = decryptedMap[handle];
        let value = rawValue !== undefined ? Number(rawValue) : null;
        
        // Check for null sentinel values
        const fieldType = HEALTH_FIELD_TYPES[field];
        if (fieldType === 'euint32' && value === NULL_UINT32) {
          value = null;
        } else if (fieldType === 'euint16' && value === NULL_UINT16) {
          value = null;
        } else if (fieldType === 'euint8' && value === NULL_UINT8) {
          value = null;
        }

        // Special handling for biomarker (euint64 -> BigInt)
        if (field === 'biomarker' && rawValue !== undefined) {
          value = BigInt(rawValue);
        }

        decryptedRecord[field] = value;
        console.log(`   ${field}: ${value}`);
        handleIndex++;
      }

      return decryptedRecord;

    } catch (err) {
      console.error('❌ Health record decryption failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsDecrypting(false);
    }
  }, [signer]);

  /**
   * Decrypt multiple health records in batch
   * @param {Array<object>} encryptedRecords - Array of encrypted record objects
   * @returns {Promise<Array<object>>} Array of decrypted health records
   */
  const decryptHealthRecords = useCallback(async (encryptedRecords) => {
    if (!signer) {
      throw new Error('No signer available');
    }

    if (!encryptedRecords || encryptedRecords.length === 0) {
      return [];
    }

    setIsDecrypting(true);
    setError(null);

    try {
      const utils = await loadFhevmUtils();
      const provider = signer.provider || new BrowserProvider(window.ethereum);
      const contractAddress = CONTRACTS.DataRegistry.address;

      console.log(`🔓 Decrypting ${encryptedRecords.length} health records...`);

      const fieldOrder = ['age', 'gender', 'ethnicity', 'diagnosis', 'treatmentOutcome', 'biomarker', 'bmi', 'systolicBP', 'diastolicBP'];
      
      // Collect all handles from all records
      const allHandles = [];
      const handleMap = []; // { recordIndex, fieldIndex, handle }

      for (let recordIdx = 0; recordIdx < encryptedRecords.length; recordIdx++) {
        const record = encryptedRecords[recordIdx];
        for (let fieldIdx = 0; fieldIdx < fieldOrder.length; fieldIdx++) {
          const field = fieldOrder[fieldIdx];
          if (record[field]) {
            const handle = utils.handleToHex(record[field]);
            allHandles.push(handle);
            handleMap.push({ recordIdx, fieldIdx, handle });
          }
        }
      }

      if (allHandles.length === 0) {
        console.warn('⚠️ No handles to decrypt across all records');
        return encryptedRecords.map(() => null);
      }

      console.log(`   Total handles to decrypt: ${allHandles.length}`);

      // Batch decrypt all handles
      const decryptedMap = await utils.batchDecrypt(
        provider,
        contractAddress,
        allHandles,
        signer
      );

      // Reconstruct decrypted records
      const decryptedRecords = encryptedRecords.map((_, idx) => {
        const decrypted = { recordIndex: idx };
        for (const field of fieldOrder) {
          decrypted[field] = null;
        }
        return decrypted;
      });

      // Fill in decrypted values
      for (const { recordIdx, fieldIdx, handle } of handleMap) {
        const field = fieldOrder[fieldIdx];
        const rawValue = decryptedMap[handle];
        let value = rawValue !== undefined ? Number(rawValue) : null;
        
        // Check for null sentinel values
        const fieldType = HEALTH_FIELD_TYPES[field];
        if (fieldType === 'euint32' && value === NULL_UINT32) {
          value = null;
        } else if (fieldType === 'euint16' && value === NULL_UINT16) {
          value = null;
        } else if (fieldType === 'euint8' && value === NULL_UINT8) {
          value = null;
        }

        // Special handling for biomarker (euint64 -> BigInt)
        if (field === 'biomarker' && rawValue !== undefined) {
          value = BigInt(rawValue);
        }

        decryptedRecords[recordIdx][field] = value;
      }

      console.log('✅ All records decrypted successfully');
      return decryptedRecords;

    } catch (err) {
      console.error('❌ Batch health records decryption failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsDecrypting(false);
    }
  }, [signer]);

  return {
    isInitialized,
    isDecrypting,
    error,
    decryptQueryResults,
    decryptUint64,
    decryptUint32,
    // Health record decryption for researchers
    decryptHealthRecord,
    decryptHealthRecords,
  };
}

export default useUserDecryption;
