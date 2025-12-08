'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { useConsent } from '@/hooks/useConsent';
import { useWorldId } from '@/hooks/useWorldId';
import ResearcherConsentForm from '@/components/ResearcherConsentForm';
import WorldIdVerification, { WorldIdBadge, TrustLevelIndicator } from '@/components/WorldIdVerification';
import { ArrowLeft, CheckCircle, AlertCircle, FileCheck, Shield } from 'lucide-react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ResearcherConsentPage() {
  const router = useRouter();
  const { signer, address, isConnected } = useWallet();
  const { 
    submitResearcherConsent, 
    getResearcherConsent, 
    getPaymentTerms,
    isLoading 
  } = useConsent(signer);
  const { verificationStatus, checkVerificationStatus } = useWorldId(signer);
  
  const [existingConsent, setExistingConsent] = useState(null);
  const [paymentTerms, setPaymentTerms] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('worldid'); // 'worldid', 'consent'
  const [worldIdCompleted, setWorldIdCompleted] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!signer || !address) {
        setLoading(false);
        return;
      }
      
      try {
        // Check for existing consent
        const consent = await getResearcherConsent(address);
        if (consent && consent.status === 1) { // Active
          setExistingConsent(consent);
        }
        
        // Check World ID status
        const isVerified = await checkVerificationStatus(address);
        if (isVerified) {
          setWorldIdCompleted(true);
          setStep('consent');
        }
        
        // Load payment terms
        const terms = await getPaymentTerms();
        setPaymentTerms(terms);
      } catch (err) {
        console.error('Error loading consent data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [signer, address, getResearcherConsent, getPaymentTerms, checkVerificationStatus]);

  const handleWorldIdComplete = (result) => {
    setWorldIdCompleted(true);
    setStep('consent');
  };

  const handleSubmit = async (formData) => {
    setResult(null);
    
    const res = await submitResearcherConsent(formData);
    setResult(res);
    
    if (res.success) {
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/researcher');
      }, 2000);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center">
        <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-4">Wallet Not Connected</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Please connect your wallet to complete the consent form.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  // Show existing consent status
  if (existingConsent && !result) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Link href="/researcher" className="flex items-center text-primary-500 hover:text-primary-600 mb-8">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
            <FileCheck className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Consent Already Active</h1>
          <p className="text-gray-600 dark:text-gray-400">
            You have already completed the researcher consent form.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg mb-8">
          <h3 className="font-semibold mb-4">Your Consent Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Consent Date:</span>
              <span>{new Date(existingConsent.consentTimestamp * 1000).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status:</span>
              <span className="text-green-500">Active</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/researcher/query"
            className="flex-1 py-3 px-6 bg-primary-500 text-white text-center rounded-lg hover:bg-primary-600 font-medium"
          >
            Execute Queries
          </Link>
          <button
            onClick={() => setExistingConsent(null)}
            className="flex-1 py-3 px-6 border border-gray-300 dark:border-gray-600 text-center rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 font-medium"
          >
            Update Consent
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <Link href="/researcher" className="flex items-center text-primary-500 hover:text-primary-600 mb-8">
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Dashboard
      </Link>

      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 ${step === 'worldid' ? 'text-primary-500' : worldIdCompleted ? 'text-green-500' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              step === 'worldid' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 
              worldIdCompleted ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 
              'border-gray-300'
            }`}>
              {worldIdCompleted ? <CheckCircle className="h-5 w-5" /> : '1'}
            </div>
            <span className="font-medium">World ID</span>
            <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">Optional</span>
          </div>
          
          <div className="w-8 h-0.5 bg-gray-200 dark:bg-gray-700" />
          
          <div className={`flex items-center space-x-2 ${step === 'consent' ? 'text-primary-500' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              step === 'consent' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-300'
            }`}>
              2
            </div>
            <span className="font-medium">Consent Form</span>
            <span className="text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded">Required</span>
          </div>
        </div>
      </div>

      {result && (
        <div className={`mb-8 p-4 rounded-lg flex items-start gap-4 ${
          result.success
            ? 'bg-green-50 dark:bg-green-900/20'
            : 'bg-red-50 dark:bg-red-900/20'
        }`}>
          {result.success ? (
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <h3 className={`font-bold ${
              result.success
                ? 'text-green-900 dark:text-green-200'
                : 'text-red-900 dark:text-red-200'
            }`}>
              {result.success ? 'Consent Submitted!' : 'Error'}
            </h3>
            <p className={result.success
              ? 'text-green-800 dark:text-green-300'
              : 'text-red-800 dark:text-red-300'
            }>
              {result.message || result.error}
            </p>
            {result.success && (
              <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                Redirecting to dashboard...
              </p>
            )}
          </div>
        </div>
      )}

      {/* World ID Step */}
      {step === 'worldid' && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">Verify Your Identity</h1>
            <p className="text-gray-600 dark:text-gray-400">
              World ID verification is optional but provides enhanced trust for your research
            </p>
          </div>
          
          <WorldIdVerification 
            onVerified={handleWorldIdComplete}
            showSkip={true}
          />
          
          {/* Trust Level Preview */}
          <div className="mt-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border">
            <h4 className="font-medium mb-3 flex items-center space-x-2">
              <Shield className="h-5 w-5 text-primary-500" />
              <span>Your Trust Level</span>
            </h4>
            <TrustLevelIndicator hasWorldId={worldIdCompleted} hasConsent={false} />
          </div>
        </div>
      )}

      {/* Consent Form Step */}
      {step === 'consent' && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">Researcher Consent Form</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Review and agree to the terms for accessing encrypted research data
            </p>
          </div>
          
          {/* World ID Status Badge */}
          {worldIdCompleted && (
            <div className="flex items-center justify-center mb-4">
              <WorldIdBadge 
                isVerified={verificationStatus.isVerified} 
                verificationTime={verificationStatus.verificationTime}
                size="md"
              />
            </div>
          )}
          
          <ResearcherConsentForm 
            onSubmit={handleSubmit} 
            isLoading={isLoading}
            paymentTerms={paymentTerms}
          />
          
          {/* Back to World ID button */}
          {!worldIdCompleted && (
            <button
              onClick={() => setStep('worldid')}
              className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-primary-500"
            >
              ← Back to World ID verification
            </button>
          )}
        </div>
      )}
    </div>
  );
}
