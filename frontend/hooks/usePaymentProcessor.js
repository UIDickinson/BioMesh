'use client';

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '@/lib/contracts';

export function usePaymentProcessor(signer) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getContract = useCallback(() => {
    if (!signer) throw new Error('No signer available');
    return new ethers.Contract(
      CONTRACTS.PaymentProcessor.address,
      CONTRACTS.PaymentProcessor.abi,
      signer
    );
  }, [signer]);

  const getPatientEarnings = useCallback(async (patientAddress) => {
    try {
      const contract = getContract();
      const earnings = await contract.getPatientEarnings(patientAddress);
      return ethers.formatEther(earnings);
    } catch (err) {
      setError(err.message);
      return '0';
    }
  }, [getContract]);

  const getResearcherSpending = useCallback(async (researcherAddress) => {
    try {
      const contract = getContract();
      const spending = await contract.getResearcherSpending(researcherAddress);
      return ethers.formatEther(spending);
    } catch (err) {
      console.error('Error getting researcher spending:', err);
      setError(err.message);
      return '0';
    }
  }, [getContract]);

  const getStats = useCallback(async () => {
    try {
      const contract = getContract();
      const [totalFees, totalDist, contractBal] = await contract.getStats();
      return {
        totalFeesCollected: ethers.formatEther(totalFees),
        totalDistributed: ethers.formatEther(totalDist),
        contractBalance: ethers.formatEther(contractBal),
      };
    } catch (err) {
      console.error('Error getting stats:', err);
      return {
        totalFeesCollected: '0',
        totalDistributed: '0',
        contractBalance: '0',
      };
    }
  }, [getContract]);

  const withdrawEarnings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const contract = getContract();
      const tx = await contract.withdrawEarnings();
      await tx.wait();
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getPatientEarnings,
    getResearcherSpending,
    getStats,
    withdrawEarnings,
    isLoading,
    error,
  };
}