'use client';

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, areContractsConfigured, getExplorerUrl } from '@/lib/contracts';

/**
 * Hook for interacting with the DataRegistry contract
 * Handles health data submission, record retrieval, and revocation
 */
export function useDataRegistry(signer) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getContract = useCallback(() => {
    if (!signer) {
      throw new Error('Wallet not connected. Please connect your wallet first.');
    }
    
    if (!areContractsConfigured()) {
      throw new Error('Contract addresses not configured. Check your .env.local file.');
    }
    
    if (!CONTRACTS.DataRegistry.address) {
      throw new Error('DataRegistry address not configured.');
    }
    
    return new ethers.Contract(
      CONTRACTS.DataRegistry.address,
      CONTRACTS.DataRegistry.abi,
      signer
    );
  }, [signer]);

  const submitHealthData = useCallback(async (data) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate signer
      if (!signer) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }

      // Lazy load encryption to avoid WASM issues at import time
      const { encryptHealthData, isRealFHEMode } = await import('@/lib/encryption');
      
      const address = await signer.getAddress();
      console.log('📝 Submitting health data...');
      console.log('   Wallet:', address);
      console.log('   Contract:', CONTRACTS.DataRegistry.address);
      console.log('   FHE Mode:', isRealFHEMode() ? 'PRODUCTION (real encryption)' : 'MOCK (simulated)');
      
      // Encrypt the health data
      const encrypted = await encryptHealthData(
        CONTRACTS.DataRegistry.address,
        address,
        data
      );
      
      console.log('🔐 Encryption result:', { 
        handles: encrypted.handles?.map(h => h?.toString()?.slice(0, 20) + '...'),
        proofLength: encrypted.inputProof?.length
      });

      const contract = getContract();
      
      // Prepare transaction parameters
      // The mock contract expects uint256 values, so we convert handles to BigInt
      const txParams = [
        BigInt(encrypted.handles[0]),
        BigInt(encrypted.handles[1]),
        BigInt(encrypted.handles[2]),
        BigInt(encrypted.handles[3]),
        encrypted.inputProof
      ];
      
      console.log('📄 Calling submitHealthData...');
      console.log('   Parameters:', {
        age: txParams[0].toString().slice(0, 20) + '...',
        diagnosis: txParams[1].toString().slice(0, 20) + '...',
        outcome: txParams[2].toString().slice(0, 20) + '...',
        biomarker: txParams[3].toString().slice(0, 20) + '...',
        proofBytes: encrypted.inputProof.length
      });
      
      // Estimate gas first to catch any contract errors
      try {
        const gasEstimate = await contract.submitHealthData.estimateGas(...txParams);
        console.log('   Gas estimate:', gasEstimate.toString());
      } catch (gasError) {
        console.error('❌ Gas estimation failed:', gasError);
        throw new Error(`Transaction would fail: ${gasError.reason || gasError.message}`);
      }
      
      // Send transaction
      const tx = await contract.submitHealthData(...txParams);
      console.log('📤 Transaction sent:', tx.hash);
      console.log('   Explorer:', getExplorerUrl(tx.hash, 'tx'));

      // Wait for confirmation
      console.log('⏳ Waiting for confirmation...');
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
      
      // Parse event to get record ID
      let recordId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          if (parsed?.name === 'RecordSubmitted') {
            recordId = parsed.args.recordId?.toString();
            break;
          }
        } catch {
          // Not our event, continue
        }
      }
      
      if (recordId) {
        console.log('🎉 Record submitted with ID:', recordId);
      } else {
        console.log('⚠️ Record submitted but could not parse record ID from events');
      }
      
      return { 
        success: true, 
        recordId, 
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        message: recordId 
          ? `Record #${recordId} submitted successfully!` 
          : 'Record submitted successfully!'
      };
    } catch (err) {
      console.error('❌ Submit health data error:', err);
      
      // Extract meaningful error message
      let errorMessage = 'Unknown error occurred';
      if (err.reason) {
        errorMessage = err.reason;
      } else if (err.message) {
        // Clean up common error messages
        if (err.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by user';
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for transaction';
        } else if (err.message.includes('nonce')) {
          errorMessage = 'Transaction nonce error. Please refresh and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [signer, getContract]);

  const revokeRecord = useCallback(async (recordId) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!signer) {
        throw new Error('Wallet not connected');
      }
      
      const contract = getContract();
      console.log('🗑️ Revoking record:', recordId);
      
      const tx = await contract.revokeRecord(recordId);
      console.log('📤 Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('✅ Record revoked');
      
      return { 
        success: true, 
        txHash: receipt.hash,
        message: `Record #${recordId} revoked successfully`
      };
    } catch (err) {
      console.error('❌ Revoke record error:', err);
      const errorMessage = err.reason || err.message || 'Failed to revoke record';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [signer, getContract]);

  const getPatientRecords = useCallback(async (patientAddress) => {
    try {
      if (!signer) {
        console.log('⚠️ No signer available for getPatientRecords');
        return [];
      }
      
      const contract = getContract();
      console.log('📋 Fetching records for:', patientAddress);
      
      const recordIds = await contract.getPatientRecords(patientAddress);
      console.log('   Found', recordIds.length, 'records');
      
      if (recordIds.length === 0) {
        return [];
      }
      
      const records = await Promise.all(
        recordIds.map(async (id) => {
          try {
            const record = await contract.records(id);
            // The struct returns: age, diagnosis, treatmentOutcome, biomarker, patient, timestamp, isActive
            // When using array access: record[0]=age, record[1]=diagnosis, ..., record[4]=patient, record[5]=timestamp, record[6]=isActive
            // When using named access (if ABI has names): record.patient, record.timestamp, record.isActive
            console.log(`   Record ${id} raw:`, {
              age: record.age?.toString() || record[0]?.toString(),
              patient: record.patient || record[4],
              timestamp: record.timestamp?.toString() || record[5]?.toString(),
              isActive: record.isActive ?? record[6]
            });
            
            // Handle both named and positional access
            const patient = record.patient || record[4];
            const timestamp = record.timestamp || record[5];
            const isActive = record.isActive ?? record[6];
            
            return {
              id: id.toString(),
              patient: patient,
              timestamp: Number(timestamp),
              isActive: isActive,
              date: new Date(Number(timestamp) * 1000).toLocaleString(),
            };
          } catch (err) {
            console.error(`Failed to fetch record ${id}:`, err);
            return null;
          }
        })
      );

      // Filter out any failed record fetches
      return records.filter(r => r !== null);
    } catch (err) {
      console.error('❌ Get patient records error:', err);
      setError(err.message);
      return [];
    }
  }, [signer, getContract]);

  // Get total record count
  const getRecordCount = useCallback(async () => {
    try {
      const contract = getContract();
      const count = await contract.recordCount();
      return Number(count);
    } catch (err) {
      console.error('Failed to get record count:', err);
      return 0;
    }
  }, [getContract]);

  return {
    submitHealthData,
    revokeRecord,
    getPatientRecords,
    getRecordCount,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}