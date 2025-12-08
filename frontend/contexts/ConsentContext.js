'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useConsent, ConsentStatus, UserRole } from '@/hooks/useConsent';
import { useWorldId } from '@/hooks/useWorldId';

/**
 * Consent Context
 * 
 * Provides centralized state management for user consent and verification status.
 * This context tracks:
 * - Patient consent status
 * - Researcher consent status  
 * - World ID verification (optional)
 * - User role (Patient, Researcher, Both, None)
 */

const ConsentContext = createContext(null);

export function ConsentProvider({ children }) {
  const { signer, address, isConnected } = useWallet();
  
  // Hooks for contract interaction - destructure the specific functions we need
  const { 
    getUserStatus, 
    getPatientConsent, 
    getResearcherConsent, 
    getPaymentTerms,
    submitPatientConsent: submitPatientConsentFn,
    submitResearcherConsent: submitResearcherConsentFn,
    revokePatientConsent: revokePatientConsentFn,
    revokeResearcherConsent: revokeResearcherConsentFn
  } = useConsent(signer);
  
  const { 
    checkVerificationStatus, 
    verificationStatus: worldIdVerificationStatus,
    openWorldIdWidget 
  } = useWorldId(signer);
  
  // State
  const [userStatus, setUserStatus] = useState({
    isWorldIdVerified: false,
    hasPatientConsent: false,
    hasResearcherConsent: false,
    role: UserRole.None
  });
  
  const [patientConsent, setPatientConsent] = useState(null);
  const [researcherConsent, setResearcherConsent] = useState(null);
  const [paymentTerms, setPaymentTerms] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  /**
   * Load user status and consent details from the contract
   */
  const refreshStatus = useCallback(async () => {
    if (!signer || !address) {
      setUserStatus({
        isWorldIdVerified: false,
        hasPatientConsent: false,
        hasResearcherConsent: false,
        role: UserRole.None
      });
      setPatientConsent(null);
      setResearcherConsent(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get user status
      const status = await getUserStatus(address);
      setUserStatus(status);
      
      // Get detailed consent data if applicable
      if (status.hasPatientConsent) {
        const patientData = await getPatientConsent(address);
        setPatientConsent(patientData);
      } else {
        setPatientConsent(null);
      }
      
      if (status.hasResearcherConsent) {
        const researcherData = await getResearcherConsent(address);
        setResearcherConsent(researcherData);
      } else {
        setResearcherConsent(null);
      }
      
      // Get payment terms
      const terms = await getPaymentTerms();
      setPaymentTerms(terms);
      
      // Check World ID status
      await checkVerificationStatus(address);
      
      setLastRefresh(Date.now());
    } catch (err) {
      console.error('Error refreshing consent status:', err);
      setError(err?.message || 'Failed to load consent status');
    } finally {
      setIsLoading(false);
    }
  }, [signer, address, getUserStatus, getPatientConsent, getResearcherConsent, getPaymentTerms, checkVerificationStatus]);

  // Auto-refresh on wallet connection - only run once when connected
  useEffect(() => {
    if (isConnected && address && !hasInitialized) {
      setHasInitialized(true);
      refreshStatus();
    } else if (!isConnected) {
      setHasInitialized(false);
    }
  }, [isConnected, address, hasInitialized, refreshStatus]);

  /**
   * Submit patient consent
   */
  const submitPatientConsent = useCallback(async (consentData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await submitPatientConsentFn(consentData);
      
      if (result.success) {
        // Refresh status after successful submission
        await refreshStatus();
      }
      
      return result;
    } catch (err) {
      setError(err?.message || 'Failed to submit consent');
      return { success: false, error: err?.message };
    } finally {
      setIsLoading(false);
    }
  }, [submitPatientConsentFn, refreshStatus]);

  /**
   * Submit researcher consent
   */
  const submitResearcherConsent = useCallback(async (consentData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await submitResearcherConsentFn(consentData);
      
      if (result.success) {
        // Refresh status after successful submission
        await refreshStatus();
      }
      
      return result;
    } catch (err) {
      setError(err?.message || 'Failed to submit consent');
      return { success: false, error: err?.message };
    } finally {
      setIsLoading(false);
    }
  }, [submitResearcherConsentFn, refreshStatus]);

  /**
   * Revoke patient consent
   */
  const revokePatientConsent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await revokePatientConsentFn();
      
      if (result.success) {
        await refreshStatus();
      }
      
      return result;
    } catch (err) {
      setError(err?.message || 'Failed to revoke consent');
      return { success: false, error: err?.message };
    } finally {
      setIsLoading(false);
    }
  }, [revokePatientConsentFn, refreshStatus]);

  /**
   * Revoke researcher consent
   */
  const revokeResearcherConsent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await revokeResearcherConsentFn();
      
      if (result.success) {
        await refreshStatus();
      }
      
      return result;
    } catch (err) {
      setError(err?.message || 'Failed to revoke consent');
      return { success: false, error: err?.message };
    } finally {
      setIsLoading(false);
    }
  }, [revokeResearcherConsentFn, refreshStatus]);

  /**
   * Verify with World ID (optional)
   */
  const verifyWorldId = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await openWorldIdWidget();
      
      if (result.success) {
        await refreshStatus();
      }
      
      return result;
    } catch (err) {
      setError(err?.message || 'World ID verification failed');
      return { success: false, error: err?.message };
    } finally {
      setIsLoading(false);
    }
  }, [openWorldIdWidget, refreshStatus]);

  /**
   * Check if user can submit data (has patient consent)
   */
  const canSubmitData = userStatus.hasPatientConsent;

  /**
   * Check if user can execute queries (has researcher consent)
   */
  const canExecuteQueries = userStatus.hasResearcherConsent;

  /**
   * Check if user needs to complete patient consent
   */
  const needsPatientConsent = !userStatus.hasPatientConsent;

  /**
   * Check if user needs to complete researcher consent
   */
  const needsResearcherConsent = !userStatus.hasResearcherConsent;

  const value = {
    // Status
    userStatus,
    patientConsent,
    researcherConsent,
    paymentTerms,
    
    // Loading/Error state
    isLoading,
    error,
    
    // World ID
    worldIdStatus: worldIdVerificationStatus,
    
    // Computed helpers
    canSubmitData,
    canExecuteQueries,
    needsPatientConsent,
    needsResearcherConsent,
    
    // Actions
    refreshStatus,
    submitPatientConsent,
    submitResearcherConsent,
    revokePatientConsent,
    revokeResearcherConsent,
    verifyWorldId,
    
    // Last refresh timestamp
    lastRefresh
  };

  return (
    <ConsentContext.Provider value={value}>
      {children}
    </ConsentContext.Provider>
  );
}

/**
 * Hook to use consent context
 */
export function useConsentContext() {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error('useConsentContext must be used within ConsentProvider');
  }
  return context;
}

/**
 * Higher-order component to require patient consent
 */
export function withPatientConsent(Component) {
  return function WithPatientConsentWrapper(props) {
    const { canSubmitData, needsPatientConsent } = useConsentContext();
    
    if (needsPatientConsent) {
      return (
        <div className="max-w-2xl mx-auto py-12 px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Consent Required</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please complete the patient consent form before submitting health data.
          </p>
          <a 
            href="/patient/consent" 
            className="inline-block px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Complete Consent Form
          </a>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
}

/**
 * Higher-order component to require researcher consent
 */
export function withResearcherConsent(Component) {
  return function WithResearcherConsentWrapper(props) {
    const { canExecuteQueries, needsResearcherConsent } = useConsentContext();
    
    if (needsResearcherConsent) {
      return (
        <div className="max-w-2xl mx-auto py-12 px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Consent Required</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please complete the researcher consent form before executing queries.
          </p>
          <a 
            href="/researcher/consent" 
            className="inline-block px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            Complete Consent Form
          </a>
        </div>
      );
    }
    
    return <Component {...props} />;
  };
}

export { ConsentStatus, UserRole };
