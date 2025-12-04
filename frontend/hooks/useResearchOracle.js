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

  return {
    computeAverageBiomarker,
    countPatientsByCriteria,
    getQueryResult,
    getQueryFee,
    getTotalQueries,
    getResearcherQueries,
    // Decryption functions
    requestDecryption,
    isDecryptionRequested,
    getDecryptedResult,
    submitDecryptedResult,
    isLoading,
    error,
  };
}