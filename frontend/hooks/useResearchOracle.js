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
      };
    } catch (err) {
      console.error('Error getting query result:', err);
      setError(err.message);
      return null;
    }
  }, [getContract]);

  return {
    computeAverageBiomarker,
    countPatientsByCriteria,
    getQueryResult,
    getQueryFee,
    getTotalQueries,
    getResearcherQueries,
    isLoading,
    error,
  };
}