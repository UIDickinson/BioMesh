'use client';

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '@/lib/contracts';

export function useResearchOracle(signer) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getContract = useCallback(() => {
    if (!signer) throw new Error('No signer available');
    return new ethers.Contract(
      CONTRACTS.ResearchOracle.address,
      CONTRACTS.ResearchOracle.abi,
      signer
    );
  }, [signer]);

  const getQueryFee = useCallback(async () => {
    try {
      const contract = getContract();
      const fee = await contract.queryFee();
      return ethers.formatEther(fee);
    } catch (err) {
      return '0.01';
    }
  }, [getContract]);

  const getIndividualQueryFee = useCallback(async () => {
    try {
      const contract = getContract();
      const fee = await contract.individualQueryFee();
      return ethers.formatEther(fee);
    } catch (err) {
      return '0.02'; // Default 2x aggregate fee
    }
  }, [getContract]);

  const getTotalQueries = useCallback(async () => {
    try {
      const contract = getContract();
      const total = await contract.getTotalQueries();
      return Number(total);
    } catch (err) {
      console.error('Error getting total queries:', err);
      return 0;
    }
  }, [getContract]);

  const getResearcherQueries = useCallback(async (researcherAddress) => {
    try {
      const contract = getContract();
      const queryIds = await contract.getResearcherQueries(researcherAddress);
      return queryIds.map(id => Number(id));
    } catch (err) {
      console.error('Error getting researcher queries:', err);
      return [];
    }
  }, [getContract]);

  const computeAverageBiomarker = async (minAge, maxAge, diagnosisCode) => {
    setIsLoading(true);
    setError(null);

    try {
      const contract = getContract();
      const fee = await contract.queryFee();
      
      const tx = await contract.computeAverageBiomarker(
        minAge,
        maxAge,
        diagnosisCode,
        { value: fee }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return contract.interface.parseLog(log).name === 'QueryExecuted';
        } catch { return false; }
      });

      const queryId = event ? contract.interface.parseLog(event).args.queryId : null;
      return { success: true, queryId: queryId?.toString() };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const countPatientsByCriteria = async (diagnosisCode, minOutcome) => {
    setIsLoading(true);
    setError(null);

    try {
      const contract = getContract();
      const fee = await contract.queryFee();
      
      const tx = await contract.countPatientsByCriteria(
        diagnosisCode,
        minOutcome,
        { value: fee }
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return contract.interface.parseLog(log).name === 'QueryExecuted';
        } catch { return false; }
      });

      const queryId = event ? contract.interface.parseLog(event).args.queryId : null;
      return { success: true, queryId: queryId?.toString() };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const getQueryResult = useCallback(async (queryId) => {
    try {
      const contract = getContract();
      const result = await contract.queryResults(queryId);
      return {
        queryId: Number(result.queryId || result[0]),
        researcher: result.researcher || result[1],
        recordCount: Number(result.recordCount || result[2]),
        encryptedSum: result.encryptedSum || result[3],
        encryptedCount: result.encryptedCount || result[4],
        timestamp: Number(result.timestamp || result[5]),
        isDecrypted: result.isDecrypted || result[6] || false,
        decryptedSum: result.decryptedSum ? Number(result.decryptedSum) : 0,
        decryptedCount: result.decryptedCount ? Number(result.decryptedCount) : 0,
      };
    } catch (err) {
      console.error('Error getting query result:', err);
      setError(err.message);
      return null;
    }
  }, [getContract]);

  // ============ Decryption Functions ============

  const requestDecryption = async (queryId) => {
    setIsLoading(true);
    setError(null);

    try {
      const contract = getContract();
      console.log('🔓 Requesting decryption for query:', queryId);
      
      const tx = await contract.requestDecryption(queryId);
      console.log('📤 Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('✅ Decryption requested, waiting for result...');
      
      return { success: true, txHash: receipt.hash };
    } catch (err) {
      console.error('❌ Error requesting decryption:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const isDecryptionRequested = useCallback(async (queryId) => {
    try {
      const contract = getContract();
      return await contract.isDecryptionRequested(queryId);
    } catch (err) {
      console.error('Error checking decryption status:', err);
      return false;
    }
  }, [getContract]);

  const getDecryptedResult = useCallback(async (queryId) => {
    try {
      const contract = getContract();
      const result = await contract.getDecryptedResult(queryId);
      return {
        sum: Number(result.sum || result[0]),
        count: Number(result.count || result[1]),
        average: Number(result.average || result[2]),
        isReady: result.isReady || result[3] || false,
      };
    } catch (err) {
      console.error('Error getting decrypted result:', err);
      return { sum: 0, count: 0, average: 0, isReady: false };
    }
  }, [getContract]);

  const submitDecryptedResult = async (queryId, decryptedSum, decryptedCount, proof = '0x') => {
    setIsLoading(true);
    setError(null);

    try {
      const contract = getContract();
      console.log('📝 Submitting decrypted result:', { queryId, decryptedSum, decryptedCount });
      
      const tx = await contract.submitDecryptedResult(
        queryId,
        decryptedSum,
        decryptedCount,
        proof
      );
      
      const receipt = await tx.wait();
      console.log('✅ Decrypted result submitted');
      
      return { success: true, txHash: receipt.hash };
    } catch (err) {
      console.error('❌ Error submitting decrypted result:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // ============ Individual Records Query Functions ============

  const queryIndividualRecords = async (diagnosisCode, minAge, maxAge, maxResults = 10) => {
    setIsLoading(true);
    setError(null);

    try {
      const contract = getContract();
      const fee = await contract.individualQueryFee();
      
      console.log('🔍 Executing individual records query:', { diagnosisCode, minAge, maxAge, fee: ethers.formatEther(fee) });
      
      // Note: Contract signature is queryIndividualRecords(minAge, maxAge, diagnosisCode)
      const tx = await contract.queryIndividualRecords(
        minAge,
        maxAge,
        diagnosisCode,
        { value: fee }
      );

      const receipt = await tx.wait();
      
      // Look for IndividualQueryExecuted event or fallback to QueryExecuted
      let queryId, matchCount, kAnonymityMet;
      
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed.name === 'IndividualQueryExecuted') {
            queryId = parsed.args.queryId;
            matchCount = parsed.args.totalMatching;
            kAnonymityMet = parsed.args.kAnonymityMet;
            break;
          } else if (parsed.name === 'QueryExecuted' && !queryId) {
            queryId = parsed.args.queryId;
          }
        } catch {}
      }
      
      console.log('✅ Individual query executed:', { queryId: queryId?.toString(), matchCount: matchCount?.toString(), kAnonymityMet });
      
      return { 
        success: true, 
        queryId: queryId?.toString(),
        matchCount: matchCount ? Number(matchCount) : 0,
        kAnonymityMet: kAnonymityMet || false
      };
    } catch (err) {
      console.error('❌ Error executing individual query:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Get individual query results (recordIds, k-anonymity status, counts)
  const getIndividualQueryResults = useCallback(async (queryId) => {
    try {
      const contract = getContract();
      const result = await contract.getIndividualQueryResults(queryId);
      return {
        recordIds: result.recordIds || result[0] || [],
        kAnonymityMet: result.kAnonymityMet ?? result[1] ?? false,
        totalMatching: Number(result.totalMatching || result[2] || 0),
        individualAccessCount: Number(result.individualAccessCount || result[3] || 0),
      };
    } catch (err) {
      console.error('Error getting individual query results:', err);
      return null;
    }
  }, [getContract]);

  // Alias for backwards compatibility
  const getIndividualQueryResult = getIndividualQueryResults;

  // Get all individual records (fetches from DataRegistry for each recordId)
  const getAllIndividualRecords = useCallback(async (queryId) => {
    try {
      const result = await getIndividualQueryResults(queryId);
      if (!result || !result.kAnonymityMet || result.recordIds.length === 0) {
        console.log('No individual records available:', result);
        return [];
      }
      
      // Note: In production, we'd fetch actual record data from DataRegistry
      // For now, return the record IDs with placeholder data
      // The actual encrypted data would need FHE decryption
      const records = result.recordIds.map((recordId, index) => ({
        anonymousId: `0x${recordId.toString(16).padStart(64, '0')}`,
        recordId: Number(recordId),
        // These would come from DataRegistry with proper decryption
        age: 0,
        diagnosis: 0,
        treatmentOutcome: 0,
        biomarker: 0,
      }));
      
      return records;
    } catch (err) {
      console.error('Error getting all individual records:', err);
      return [];
    }
  }, [getIndividualQueryResults]);

  // Fetch encrypted record data from DataRegistry for researcher decryption
  const fetchEncryptedRecords = useCallback(async (recordIds) => {
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log(`📋 Fetching encrypted data for ${recordIds.length} records...`);
      
      // Get DataRegistry contract
      const dataRegistryContract = new ethers.Contract(
        CONTRACTS.DataRegistry.address,
        CONTRACTS.DataRegistry.abi,
        signer
      );

      const encryptedRecords = [];

      for (const recordId of recordIds) {
        try {
          // Fetch the record struct from DataRegistry
          // Note: getRecord() returns the HealthRecord struct
          const record = await dataRegistryContract.getRecord(recordId);
          
          encryptedRecords.push({
            recordId: Number(recordId),
            // Encrypted handles (FHE ciphertexts)
            age: record.age,
            gender: record.gender,
            ethnicity: record.ethnicity,
            diagnosis: record.diagnosis,
            treatmentOutcome: record.treatmentOutcome,
            biomarker: record.biomarker,
            bmi: record.bmi,
            systolicBP: record.systolicBP,
            diastolicBP: record.diastolicBP,
            // Metadata (not encrypted)
            patient: record.patient,
            timestamp: Number(record.timestamp),
            isActive: record.isActive,
          });
          
          console.log(`   Record ${recordId}: fetched encrypted handles`);
        } catch (err) {
          console.error(`Failed to fetch record ${recordId}:`, err);
          // Continue with other records
        }
      }

      console.log(`✅ Fetched ${encryptedRecords.length} encrypted records`);
      return encryptedRecords;

    } catch (err) {
      console.error('❌ Error fetching encrypted records:', err);
      throw err;
    }
  }, [signer]);

  return {
    computeAverageBiomarker,
    countPatientsByCriteria,
    getQueryResult,
    getQueryFee,
    getIndividualQueryFee,
    getTotalQueries,
    getResearcherQueries,
    // Decryption functions
    requestDecryption,
    isDecryptionRequested,
    getDecryptedResult,
    submitDecryptedResult,
    // Individual records query functions
    queryIndividualRecords,
    getIndividualQueryResult,
    getIndividualQueryResults,
    getAllIndividualRecords,
    // Encrypted record fetch for researcher decryption
    fetchEncryptedRecords,
    isLoading,
    error,
  };
}