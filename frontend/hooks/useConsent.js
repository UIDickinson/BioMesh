'use client';

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '@/lib/contracts';

/**
 * User role enum (matches contract)
 */
export const UserRole = {
  None: 0,
  Patient: 1,
  Researcher: 2,
  Both: 3
};

/**
 * Consent status enum (matches contract)
 */
export const ConsentStatus = {
  NotGiven: 0,
  Active: 1,
  Revoked: 2,
  Expired: 3
};

/**
 * Get human-readable role label
 */
export function getRoleLabel(role) {
  const labels = {
    [UserRole.None]: 'Not Registered',
    [UserRole.Patient]: 'Patient',
    [UserRole.Researcher]: 'Researcher',
    [UserRole.Both]: 'Patient & Researcher'
  };
  return labels[role] || 'Unknown';
}

/**
 * Get human-readable consent status
 */
export function getConsentStatusLabel(status) {
  const labels = {
    [ConsentStatus.NotGiven]: 'Not Given',
    [ConsentStatus.Active]: 'Active',
    [ConsentStatus.Revoked]: 'Revoked',
    [ConsentStatus.Expired]: 'Expired'
  };
  return labels[status] || 'Unknown';
}

/**
 * Hook for interacting with the ConsentRegistry contract
 */
export function useConsent(signer) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getContract = useCallback(() => {
    if (!signer) {
      throw new Error('Wallet not connected');
    }
    
    if (!CONTRACTS.ConsentRegistry?.address) {
      throw new Error('ConsentRegistry address not configured');
    }
    
    return new ethers.Contract(
      CONTRACTS.ConsentRegistry.address,
      CONTRACTS.ConsentRegistry.abi,
      signer
    );
  }, [signer]);

  /**
   * Get user's complete verification and consent status
   */
  const getUserStatus = useCallback(async (address) => {
    // Return default values if signer not available
    if (!signer) {
      return {
        isWorldIdVerified: false,
        hasPatientConsent: false,
        hasResearcherConsent: false,
        role: UserRole.None
      };
    }
    
    try {
      const contract = getContract();
      const status = await contract.getUserStatus(address);
      
      return {
        isWorldIdVerified: status[0],
        hasPatientConsent: status[1],
        hasResearcherConsent: status[2],
        role: Number(status[3])
      };
    } catch (err) {
      // Only log if it's not a contract configuration issue
      if (!err.message?.includes('not configured')) {
        console.error('Error getting user status:', err);
      }
      return {
        isWorldIdVerified: false,
        hasPatientConsent: false,
        hasResearcherConsent: false,
        role: UserRole.None
      };
    }
  }, [signer, getContract]);

/**
 * Check if user can submit health data
 * Note: Only consent is required. World ID is optional for enhanced trust.
 */
const canSubmitData = useCallback(async (address) => {
  try {
    const contract = getContract();
    return await contract.canSubmitData(address);
  } catch (err) {
    console.error('Error checking submit permission:', err);
    return false;
  }
}, [getContract]);

/**
 * Check if user can execute research queries
 * Note: Only consent is required. World ID is optional for enhanced trust.
 */
const canExecuteQueries = useCallback(async (address) => {
  try {
    const contract = getContract();
    return await contract.canExecuteQueries(address);
  } catch (err) {
    console.error('Error checking query permission:', err);
    return false;
  }
}, [getContract]);

/**
 * Check if user can submit data with enhanced trust (World ID + Consent)
 */
const canSubmitDataWithTrust = useCallback(async (address) => {
  try {
    const contract = getContract();
    return await contract.canSubmitDataWithTrust(address);
  } catch (err) {
    console.error('Error checking enhanced submit permission:', err);
    return false;
  }
}, [getContract]);

/**
 * Check if user can execute queries with enhanced trust (World ID + Consent)
 */
const canExecuteQueriesWithTrust = useCallback(async (address) => {
  try {
    const contract = getContract();
    return await contract.canExecuteQueriesWithTrust(address);
  } catch (err) {
    console.error('Error checking enhanced query permission:', err);
    return false;
  }
}, [getContract]);  /**
   * Get patient consent details
   */
  const getPatientConsent = useCallback(async (address) => {
    try {
      const contract = getContract();
      const consent = await contract.getPatientConsent(address);
      
      return {
        status: Number(consent.status),
        consentTimestamp: Number(consent.consentTimestamp),
        lastUpdated: Number(consent.lastUpdated),
        acknowledgesDataUsage: consent.acknowledgesDataUsage,
        acknowledgesAnonymization: consent.acknowledgesAnonymization,
        acknowledgesPaymentTerms: consent.acknowledgesPaymentTerms,
        acknowledgesRevocationRights: consent.acknowledgesRevocationRights,
        acknowledgesRisks: consent.acknowledgesRisks,
        acceptsAggregateQueries: consent.acceptsAggregateQueries,
        acceptsIndividualQueries: consent.acceptsIndividualQueries,
        minimumPaymentTier: Number(consent.minimumPaymentTier),
        dataRetentionMonths: Number(consent.dataRetentionMonths),
        allowsInternationalResearch: consent.allowsInternationalResearch,
        consentHash: consent.consentHash
      };
    } catch (err) {
      console.error('Error getting patient consent:', err);
      return null;
    }
  }, [getContract]);

  /**
   * Get researcher consent details
   */
  const getResearcherConsent = useCallback(async (address) => {
    try {
      const contract = getContract();
      const consent = await contract.getResearcherConsent(address);
      
      return {
        status: Number(consent.status),
        consentTimestamp: Number(consent.consentTimestamp),
        lastUpdated: Number(consent.lastUpdated),
        acknowledgesDataPrivacy: consent.acknowledgesDataPrivacy,
        acknowledgesEthicalUse: consent.acknowledgesEthicalUse,
        acknowledgesPaymentTerms: consent.acknowledgesPaymentTerms,
        acknowledgesDataLimitations: consent.acknowledgesDataLimitations,
        acknowledgesSecurityObligations: consent.acknowledgesSecurityObligations,
        institutionName: consent.institutionName,
        researchPurpose: consent.researchPurpose,
        isInstitutionalReviewed: consent.isInstitutionalReviewed,
        irpApprovalReference: consent.irpApprovalReference,
        agreesToNotRedistribute: consent.agreesToNotRedistribute,
        agreesToCiteDataSource: consent.agreesToCiteDataSource,
        agreesToReportFindings: consent.agreesToReportFindings,
        consentHash: consent.consentHash
      };
    } catch (err) {
      console.error('Error getting researcher consent:', err);
      return null;
    }
  }, [getContract]);

  /**
   * Submit patient consent form
   */
  const submitPatientConsent = useCallback(async (consentData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const contract = getContract();
      
      // Note: acknowledgesRevocationRights is passed as true by default
      // since revocation rights are always implied
      const tx = await contract.submitPatientConsent(
        consentData.acknowledgesDataUsage,
        consentData.acknowledgesAnonymization,
        consentData.acknowledgesPaymentTerms,
        true, // acknowledgesRevocationRights - always true, not shown in UI
        consentData.acknowledgesRisks,
        consentData.acceptsAggregateQueries,
        consentData.acceptsIndividualQueries,
        consentData.minimumPaymentTier || 0,
        consentData.dataRetentionMonths || 0,
        consentData.allowsInternationalResearch || false
      );
      
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.hash,
        message: 'Patient consent submitted successfully'
      };
    } catch (err) {
      const errorMessage = err?.reason || err?.message || 'Failed to submit consent';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  /**
   * Submit researcher consent form
   */
  const submitResearcherConsent = useCallback(async (consentData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const contract = getContract();
      
      // Note: institutionName, researchPurpose, isInstitutionalReviewed, irpApprovalReference
      // are now optional - pass empty/false values as these fields were removed from the form
      const tx = await contract.submitResearcherConsent(
        consentData.acknowledgesDataPrivacy,
        consentData.acknowledgesEthicalUse,
        consentData.acknowledgesPaymentTerms,
        consentData.acknowledgesDataLimitations,
        consentData.acknowledgesSecurityObligations,
        '', // institutionName - removed from form
        '', // researchPurpose - removed from form
        false, // isInstitutionalReviewed - removed from form
        '', // irpApprovalReference - removed from form
        consentData.agreesToNotRedistribute,
        consentData.agreesToCiteDataSource,
        consentData.agreesToReportFindings
      );
      
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.hash,
        message: 'Researcher consent submitted successfully'
      };
    } catch (err) {
      const errorMessage = err?.reason || err?.message || 'Failed to submit consent';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  /**
   * Revoke patient consent
   */
  const revokePatientConsent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const contract = getContract();
      const tx = await contract.revokePatientConsent();
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.hash,
        message: 'Patient consent revoked successfully'
      };
    } catch (err) {
      const errorMessage = err?.reason || err?.message || 'Failed to revoke consent';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  /**
   * Revoke researcher consent
   */
  const revokeResearcherConsent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const contract = getContract();
      const tx = await contract.revokeResearcherConsent();
      const receipt = await tx.wait();
      
      return {
        success: true,
        transactionHash: receipt.hash,
        message: 'Researcher consent revoked successfully'
      };
    } catch (err) {
      const errorMessage = err?.reason || err?.message || 'Failed to revoke consent';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  /**
   * Get payment terms for display
   */
  const getPaymentTerms = useCallback(async () => {
    // Return default values if signer not available
    if (!signer) {
      return {
        patientShare: 70,
        platformShare: 30,
        baseQueryFee: '0.01',
        individualQueryFee: '0.02'
      };
    }
    
    try {
      const contract = getContract();
      const terms = await contract.getPaymentTerms();
      
      return {
        patientShare: Number(terms[0]),
        platformShare: Number(terms[1]),
        baseQueryFee: ethers.formatEther(terms[2]),
        individualQueryFee: ethers.formatEther(terms[3])
      };
    } catch (err) {
      // Only log if it's not a contract configuration issue
      if (!err.message?.includes('not configured')) {
        console.error('Error getting payment terms:', err);
      }
      return {
        patientShare: 70,
        platformShare: 30,
        baseQueryFee: '0.01',
        individualQueryFee: '0.02'
      };
    }
  }, [signer, getContract]);

  return {
    isLoading,
    error,
    getUserStatus,
    canSubmitData,
    canExecuteQueries,
    canSubmitDataWithTrust,
    canExecuteQueriesWithTrust,
    getPatientConsent,
    getResearcherConsent,
    submitPatientConsent,
    submitResearcherConsent,
    revokePatientConsent,
    revokeResearcherConsent,
    getPaymentTerms
  };
}
