'use client';

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS, getExplorerUrl } from '@/lib/contracts';

/**
 * Verification status enum (matches contract)
 */
export const VerificationStatus = {
  Unverified: 0,
  Pending: 1,
  AIVerified: 2,
  ProviderAttested: 3,
  Flagged: 4,
  Slashed: 5
};

/**
 * Evidence type enum (matches contract)
 */
export const EvidenceType = {
  None: 0,
  LabReport: 1,
  Prescription: 2,
  MedicalRecord: 3,
  InsuranceClaim: 4,
  ProviderLetter: 5
};

/**
 * Get human-readable status label
 */
export function getStatusLabel(status) {
  const labels = {
    [VerificationStatus.Unverified]: 'Unverified',
    [VerificationStatus.Pending]: 'Verification Pending',
    [VerificationStatus.AIVerified]: 'AI Verified',
    [VerificationStatus.ProviderAttested]: 'Provider Attested',
    [VerificationStatus.Flagged]: 'Flagged',
    [VerificationStatus.Slashed]: 'Slashed'
  };
  return labels[status] || 'Unknown';
}

/**
 * Get status color for UI
 */
export function getStatusColor(status) {
  const colors = {
    [VerificationStatus.Unverified]: 'gray',
    [VerificationStatus.Pending]: 'yellow',
    [VerificationStatus.AIVerified]: 'green',
    [VerificationStatus.ProviderAttested]: 'emerald',
    [VerificationStatus.Flagged]: 'orange',
    [VerificationStatus.Slashed]: 'red'
  };
  return colors[status] || 'gray';
}

/**
 * Get evidence type label
 */
export function getEvidenceTypeLabel(type) {
  const labels = {
    [EvidenceType.None]: 'None',
    [EvidenceType.LabReport]: 'Lab Report',
    [EvidenceType.Prescription]: 'Prescription',
    [EvidenceType.MedicalRecord]: 'Medical Record',
    [EvidenceType.InsuranceClaim]: 'Insurance Claim',
    [EvidenceType.ProviderLetter]: 'Provider Letter'
  };
  return labels[type] || 'Unknown';
}

/**
 * Hook for interacting with the VerificationRegistry contract
 */
export function useVerification(signer) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getContract = useCallback(() => {
    if (!signer) {
      throw new Error('Wallet not connected');
    }
    
    if (!CONTRACTS.VerificationRegistry?.address) {
      throw new Error('VerificationRegistry address not configured');
    }
    
    return new ethers.Contract(
      CONTRACTS.VerificationRegistry.address,
      CONTRACTS.VerificationRegistry.abi,
      signer
    );
  }, [signer]);

  /**
   * Deposit stake for a health record
   * @param recordId - The record ID
   * @param stakeAmount - Amount in ETH (string)
   */
  const depositStake = useCallback(async (recordId, stakeAmount) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const contract = getContract();
      const value = ethers.parseEther(stakeAmount);
      
      console.log('💰 Depositing stake...');
      console.log('   Record ID:', recordId);
      console.log('   Amount:', stakeAmount, 'ETH');
      
      const tx = await contract.depositStake(recordId, { value });
      console.log('📤 Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('✅ Stake deposited in block:', receipt.blockNumber);
      
      return {
        success: true,
        txHash: tx.hash,
        explorerUrl: getExplorerUrl(tx.hash, 'tx')
      };
    } catch (err) {
      console.error('Stake deposit error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  /**
   * Request AI verification for a record
   * @param recordId - The record ID
   * @param documentHash - SHA256 hash of the document (bytes32)
   * @param evidenceType - Type of document (EvidenceType enum)
   */
  const requestAIVerification = useCallback(async (recordId, documentHash, evidenceType) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const contract = getContract();
      
      console.log('📄 Requesting AI verification...');
      console.log('   Record ID:', recordId);
      console.log('   Document hash:', documentHash);
      console.log('   Evidence type:', getEvidenceTypeLabel(evidenceType));
      
      const tx = await contract.requestAIVerification(recordId, documentHash, evidenceType);
      console.log('📤 Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('✅ Verification request submitted in block:', receipt.blockNumber);
      
      return {
        success: true,
        txHash: tx.hash,
        explorerUrl: getExplorerUrl(tx.hash, 'tx')
      };
    } catch (err) {
      console.error('AI verification request error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  /**
   * Extract data from document using AI (for auto-fill)
   * Does NOT compare with form data - just extracts
   */
  const extractDocumentData = useCallback(async (file) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📄 Extracting data from document...');
      
      const uploadData = new FormData();
      uploadData.append('document', file);
      // Send empty form data - we just want extraction
      uploadData.append('age', '');
      uploadData.append('gender', '');
      uploadData.append('bloodType', '');
      uploadData.append('diagnosis', '');
      uploadData.append('biomarker', '');
      uploadData.append('outcome', '');
      
      const response = await fetch('/api/verify-document', {
        method: 'POST',
        body: uploadData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Document extraction failed');
      }
      
      const aiResult = await response.json();
      console.log('🤖 AI extraction result:', aiResult.extracted);
      
      // Map extracted data to form field format
      const extracted = aiResult.extracted || {};
      
      // Find primary biomarker (usually glucose for diabetes, or first available)
      let primaryBiomarker = '';
      if (extracted.biomarkers?.length > 0) {
        // Prefer fasting glucose, otherwise use first biomarker
        const glucoseMarker = extracted.biomarkers.find(b => 
          b.name?.toLowerCase().includes('glucose') || 
          b.name?.toLowerCase().includes('fasting')
        );
        primaryBiomarker = glucoseMarker?.value?.toString() || 
                          extracted.biomarkers[0]?.value?.toString() || '';
      }
      
      // Map diagnosis code from ICD-10 to our simplified system
      let diagnosisCode = '';
      if (extracted.diagnosisCodes?.length > 0) {
        const icdCode = extracted.diagnosisCodes[0]?.code || '';
        // Map common ICD-10 prefixes to our simplified codes
        if (icdCode.startsWith('E1')) diagnosisCode = '350'; // Diabetes
        else if (icdCode.startsWith('I1')) diagnosisCode = '650'; // Hypertension
        else if (icdCode.startsWith('J')) diagnosisCode = '750'; // Respiratory
        else if (icdCode.startsWith('C')) diagnosisCode = '150'; // Cancer
        else if (icdCode.startsWith('F')) diagnosisCode = '450'; // Mental health
        else if (icdCode.startsWith('G')) diagnosisCode = '550'; // Nervous system
        else if (icdCode.startsWith('K')) diagnosisCode = '850'; // Digestive
        else if (icdCode.startsWith('M')) diagnosisCode = '950'; // Musculoskeletal
        else diagnosisCode = '1000'; // Other
      }
      
      const formData = {
        age: extracted.patientAge?.toString() || '',
        gender: extracted.patientGender?.toLowerCase() || '',
        bloodType: extracted.bloodType || '',
        diagnosis: diagnosisCode,
        biomarker: primaryBiomarker,
        outcome: extracted.treatmentOutcome?.toString() || ''
      };
      
      console.log('📋 Mapped form data:', formData);
      
      return {
        success: true,
        formData,
        extracted,
        documentHash: aiResult.documentHash,
        documentType: extracted.documentType,
        providerName: extracted.providerName,
        documentDate: extracted.documentDate,
        allBiomarkers: extracted.biomarkers,
        allDiagnoses: extracted.diagnosisCodes
      };
    } catch (err) {
      console.error('Document extraction error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Pre-verify document using AI only (no on-chain transaction)
   * Use this before submitting health data to check if document matches
   */
  const preVerifyDocument = useCallback(async (file, formData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Pre-verifying document with AI...');
      console.log('📝 Form data being sent:', {
        age: formData.age,
        gender: formData.gender,
        bloodType: formData.bloodType,
        diagnosis: formData.diagnosis,
        biomarker: formData.biomarker,
        outcome: formData.outcome
      });
      
      // Upload to AI Oracle API only - no on-chain transaction
      const uploadData = new FormData();
      uploadData.append('document', file);
      // Required fields
      uploadData.append('age', formData.age || '');
      uploadData.append('gender', formData.gender || '');
      uploadData.append('bloodType', formData.bloodType || '');
      uploadData.append('diagnosis', formData.diagnosis || '');
      uploadData.append('biomarker', formData.biomarker || '');
      // Optional fields
      uploadData.append('outcome', formData.outcome || '');
      
      console.log('📤 Uploading document to AI Oracle...');
      const response = await fetch('/api/verify-document', {
        method: 'POST',
        body: uploadData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Document verification failed');
      }
      
      const aiResult = await response.json();
      console.log('🤖 AI pre-verification result:', aiResult);
      
      // Determine evidence type from AI result
      const evidenceTypeMap = {
        'lab_report': EvidenceType.LabReport,
        'prescription': EvidenceType.Prescription,
        'medical_record': EvidenceType.MedicalRecord,
        'insurance_claim': EvidenceType.InsuranceClaim,
        'provider_letter': EvidenceType.ProviderLetter
      };
      const evidenceType = evidenceTypeMap[aiResult.extracted?.documentType] || EvidenceType.LabReport;
      
      return {
        success: true,
        documentHash: aiResult.documentHash,
        confidenceScore: aiResult.confidenceScore,
        passed: aiResult.passed,
        evidenceType,
        matches: aiResult.matches,
        summary: aiResult.summary,
        extracted: aiResult.extracted
      };
    } catch (err) {
      console.error('Pre-verification error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Upload document and verify via AI Oracle API
   * This handles the full flow: upload → AI extraction → on-chain verification
   * IMPORTANT: Only call this AFTER the health record has been submitted
   */
  const verifyDocument = useCallback(async (recordId, file, formData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Starting document verification flow...');
      console.log('   Record ID:', recordId);
      
      if (!recordId || recordId === '0' || recordId === 0) {
        throw new Error('Invalid record ID. Submit health data first.');
      }
      
      // Step 1: Upload to AI Oracle API
      const uploadData = new FormData();
      uploadData.append('document', file);
      uploadData.append('age', formData.age);
      uploadData.append('diagnosis', formData.diagnosis);
      uploadData.append('outcome', formData.outcome);
      uploadData.append('biomarker', formData.biomarker);
      
      console.log('📤 Uploading document to AI Oracle...');
      const response = await fetch('/api/verify-document', {
        method: 'POST',
        body: uploadData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Document verification failed');
      }
      
      const aiResult = await response.json();
      console.log('🤖 AI verification result:', aiResult);
      
      // Step 2: Determine evidence type from AI result
      const evidenceTypeMap = {
        'lab_report': EvidenceType.LabReport,
        'prescription': EvidenceType.Prescription,
        'medical_record': EvidenceType.MedicalRecord,
        'insurance_claim': EvidenceType.InsuranceClaim,
        'provider_letter': EvidenceType.ProviderLetter
      };
      const evidenceType = evidenceTypeMap[aiResult.extracted?.documentType] || EvidenceType.None;
      
      // Step 3: Submit verification request on-chain
      const contract = getContract();
      
      console.log('📝 Submitting verification request on-chain...');
      const requestTx = await contract.requestAIVerification(
        recordId,
        aiResult.documentHash,
        evidenceType
      );
      await requestTx.wait();
      console.log('✅ Verification request submitted');
      
      // Step 4: Submit AI verification result (normally done by oracle, but we're the oracle here)
      // In production, this would be called by a backend service with oracle permissions
      // For now, we'll return the result and let the admin/oracle submit it
      
      return {
        success: true,
        aiResult,
        documentHash: aiResult.documentHash,
        confidenceScore: aiResult.confidenceScore,
        passed: aiResult.passed,
        evidenceType,
        matches: aiResult.matches,
        summary: aiResult.summary,
        requestTxHash: requestTx.hash
      };
    } catch (err) {
      console.error('Document verification error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  /**
   * Get verification data for a record
   */
  const getVerification = useCallback(async (recordId) => {
    try {
      const contract = getContract();
      const verification = await contract.getVerification(recordId);
      
      return {
        status: Number(verification.status),
        evidenceType: Number(verification.evidenceType),
        documentHash: verification.documentHash,
        aiConfidenceScore: Number(verification.aiConfidenceScore),
        attestingProvider: verification.attestingProvider,
        stakeAmount: ethers.formatEther(verification.stakeAmount),
        verificationTimestamp: Number(verification.verificationTimestamp),
        aiExtractionSummary: verification.aiExtractionSummary
      };
    } catch (err) {
      console.error('Get verification error:', err);
      return null;
    }
  }, [getContract]);

  /**
   * Get patient reputation
   */
  const getReputation = useCallback(async (address) => {
    try {
      const contract = getContract();
      const reputation = await contract.getReputation(address);
      
      return {
        totalSubmissions: Number(reputation.totalSubmissions),
        verifiedCount: Number(reputation.verifiedCount),
        flaggedCount: Number(reputation.flaggedCount),
        slashedCount: Number(reputation.slashedCount),
        reputationScore: Number(reputation.reputationScore) / 10, // Convert to percentage
        lastUpdated: Number(reputation.lastUpdated)
      };
    } catch (err) {
      console.error('Get reputation error:', err);
      return null;
    }
  }, [getContract]);

  /**
   * Get reputation score only
   */
  const getReputationScore = useCallback(async (address) => {
    try {
      const contract = getContract();
      const score = await contract.getReputationScore(address);
      return Number(score) / 10; // Convert to percentage (0-100.0%)
    } catch (err) {
      console.error('Get reputation score error:', err);
      return null;
    }
  }, [getContract]);

  /**
   * Calculate trust score for a record
   */
  const getTrustScore = useCallback(async (recordId) => {
    try {
      const contract = getContract();
      const score = await contract.calculateTrustScore(recordId);
      return Number(score);
    } catch (err) {
      console.error('Get trust score error:', err);
      return null;
    }
  }, [getContract]);

  /**
   * Return stake after verification passed
   */
  const returnStake = useCallback(async (recordId) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const contract = getContract();
      
      console.log('💰 Returning stake...');
      console.log('   Record ID:', recordId);
      
      const tx = await contract.returnStake(recordId);
      console.log('📤 Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('✅ Stake returned in block:', receipt.blockNumber);
      
      return {
        success: true,
        txHash: tx.hash,
        explorerUrl: getExplorerUrl(tx.hash, 'tx')
      };
    } catch (err) {
      console.error('Stake return error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  /**
   * Flag a record as potentially fraudulent
   */
  const flagRecord = useCallback(async (recordId, reason) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const contract = getContract();
      
      console.log('🚩 Flagging record...');
      console.log('   Record ID:', recordId);
      console.log('   Reason:', reason);
      
      const tx = await contract.flagRecord(recordId, reason);
      console.log('📤 Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('✅ Record flagged in block:', receipt.blockNumber);
      
      return {
        success: true,
        txHash: tx.hash,
        explorerUrl: getExplorerUrl(tx.hash, 'tx')
      };
    } catch (err) {
      console.error('Flag record error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  /**
   * Get contract constants
   */
  const getConstants = useCallback(async () => {
    try {
      const contract = getContract();
      
      const [minStake, maxStake, confidenceThreshold, disputeWindow] = await Promise.all([
        contract.MIN_STAKE(),
        contract.MAX_STAKE(),
        contract.AI_CONFIDENCE_THRESHOLD(),
        contract.DISPUTE_WINDOW()
      ]);
      
      return {
        minStake: ethers.formatEther(minStake),
        maxStake: ethers.formatEther(maxStake),
        confidenceThreshold: Number(confidenceThreshold),
        disputeWindowDays: Number(disputeWindow) / 86400
      };
    } catch (err) {
      console.error('Get constants error:', err);
      return null;
    }
  }, [getContract]);

  return {
    // State
    isLoading,
    error,
    
    // Stake functions
    depositStake,
    returnStake,
    
    // Verification functions
    requestAIVerification,
    extractDocumentData, // Extract data for auto-fill
    preVerifyDocument,  // AI only, no on-chain
    verifyDocument,     // Full flow with on-chain
    getVerification,
    
    // Reputation functions
    getReputation,
    getReputationScore,
    getTrustScore,
    
    // Other functions
    flagRecord,
    getConstants,
    
    // Helpers
    VerificationStatus,
    EvidenceType,
    getStatusLabel,
    getStatusColor,
    getEvidenceTypeLabel
  };
}
