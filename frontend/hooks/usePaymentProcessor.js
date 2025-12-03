'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '@/lib/contracts';

export function usePaymentProcessor(signer) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getContract = () => {
    if (!signer) throw new Error('No signer available');
    return new ethers.Contract(
      CONTRACTS.PaymentProcessor.address,
      CONTRACTS.PaymentProcessor.abi,
      signer
    );
  };

  const getPatientEarnings = async (patientAddress) => {
    try {
      const contract = getContract();
      const earnings = await contract.getPatientEarnings(patientAddress);
      return ethers.formatEther(earnings);
    } catch (err) {
      setError(err.message);
      return '0';
    }
  };

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
    withdrawEarnings,
    isLoading,
    error,
  };
}