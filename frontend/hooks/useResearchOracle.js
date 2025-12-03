'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '@/lib/contracts';

export function useResearchOracle(signer) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getContract = () => {
    if (!signer) throw new Error('No signer available');
    return new ethers.Contract(
      CONTRACTS.ResearchOracle.address,
      CONTRACTS.ResearchOracle.abi,
      signer
    );
  };

  const getQueryFee = async () => {
    try {
      const contract = getContract();
      const fee = await contract.queryFee();
      return ethers.formatEther(fee);
    } catch (err) {
      return '0.01';
    }
  };

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

  const getQueryResult = async (queryId) => {
    try {
      const contract = getContract();
      const result = await contract.getQueryResult(queryId);
      return {
        researcher: result.researcher,
        timestamp: Number(result.timestamp),
        isComplete: result.isComplete,
      };
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  return {
    computeAverageBiomarker,
    countPatientsByCriteria,
    getQueryResult,
    getQueryFee,
    isLoading,
    error,
  };
}