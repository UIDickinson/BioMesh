'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useDataRegistry } from '@/hooks/useDataRegistry';
import { useVerification } from '@/hooks/useVerification';
import PatientForm from '@/components/PatientForm';
import ConsentGate from '@/components/ConsentGate';
import { CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function SubmitDataPageContent() {
  const { signer, isConnected } = useWallet();
  // Call the hook unconditionally at the top level
  const registryMethods = useDataRegistry(signer);
  const verification = useVerification(signer);
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  console.log('✅ SubmitContent - Hook called successfully, registryMethods:', !!registryMethods?.submitHealthData);

  const handleSubmit = async (data) => {
    if (!registryMethods?.submitHealthData) {
      setError('Health data submission not available');
      return;
    }
    
    setResult(null);
    setError(null);
    setIsLoading(true);
    
    try {
      // First submit the health data
      const res = await registryMethods.submitHealthData(data);
      
      if (res.success) {
        // If verification is enabled, deposit stake and verify document
        if (data.verification?.enabled && res.recordId) {
          try {
            // Deposit stake
            console.log('💰 Depositing stake for verification...');
            const stakeResult = await verification.depositStake(
              res.recordId, 
              data.verification.stakeAmount
            );
            
            if (stakeResult.success && data.verification.document) {
              // Verify document
              console.log('📄 Verifying document...');
              const verifyResult = await verification.verifyDocument(
                res.recordId,
                data.verification.document,
                data
              );
              
              if (verifyResult.success) {
                setResult({
                  ...res,
                  message: `${res.message} Verification submitted with ${verifyResult.confidenceScore}% confidence.`
                });
              } else {
                setResult({
                  ...res,
                  message: `${res.message} Warning: Verification failed - ${verifyResult.error}`
                });
              }
            } else if (!stakeResult.success) {
              setResult({
                ...res,
                message: `${res.message} Warning: Stake deposit failed - ${stakeResult.error}`
              });
            }
          } catch (verifyErr) {
            console.error('Verification error:', verifyErr);
            setResult({
              ...res,
              message: `${res.message} Warning: Verification process failed - ${verifyErr.message}`
            });
          }
        } else {
          setResult(res);
        }
        setError(null);
      } else {
        // Handle error returned from the hook
        const errorMsg = res.error || res.message || 'Submission failed';
        setError(errorMsg);
        setResult({ success: false, message: errorMsg });
      }
    } catch (err) {
      const errorMsg = err?.message || 'Submission failed';
      setError(errorMsg);
      setResult({ success: false, message: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    console.log('🔴 SubmitContent - NOT CONNECTED');
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Please connect your wallet to submit data
        </p>
      </div>
    );
  }

  if (!registryMethods?.submitHealthData) {
    console.log('🟡 SubmitContent - LOADING');
    return <LoadingSpinner />;
  }

  console.log('🟢 SubmitContent - READY');

  return (
    <ConsentGate type="patient">
      <div className="max-w-4xl mx-auto py-12 px-4">
        <Link href="/patient" className="flex items-center text-primary-500 hover:text-primary-600 mb-8">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Submit Health Records</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Securely submit your encrypted health records for research. All data is encrypted using FHE.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-lg flex items-start gap-4 bg-red-50 dark:bg-red-900/20">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-900 dark:text-red-200">
                Error
              </h3>
              <p className="text-red-800 dark:text-red-300">
                {error}
              </p>
            </div>
          </div>
        )}

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
                {result.success ? 'Success' : 'Error'}
              </h3>
              <p className={result.success
                ? 'text-green-800 dark:text-green-300'
                : 'text-red-800 dark:text-red-300'
              }>
                {result.message}
              </p>
            </div>
          </div>
        )}

        <PatientForm onSubmit={handleSubmit} isLoading={isLoading} signer={signer} />
      </div>
    </ConsentGate>
  );
}
