'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useResearchOracle } from '@/hooks/useResearchOracle';
import QueryBuilder from '@/components/QueryBuilder';
import ConsentGate from '@/components/ConsentGate';
import { ArrowLeft, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import Link from 'next/link';

export default function QueryPage() {
  const { signer, isConnected } = useWallet();
  const { 
    computeAverageBiomarker, 
    countPatientsByCriteria, 
    queryIndividualRecords,
    getQueryFee, 
    getIndividualQueryFee,
    isLoading 
  } = useResearchOracle(signer);
  const [queryFee, setQueryFee] = useState('0.01');
  const [individualQueryFee, setIndividualQueryFee] = useState('0.02');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (isConnected && signer) {
      loadFees();
    }
  }, [isConnected, signer]);

  const loadFees = async () => {
    const fee = await getQueryFee();
    setQueryFee(fee);
    const indFee = await getIndividualQueryFee();
    setIndividualQueryFee(indFee);
  };

  const handleSubmit = async (queryType, params) => {
    setResult(null);
    let res;

    if (queryType === 'average') {
      res = await computeAverageBiomarker(
        parseInt(params.minAge),
        parseInt(params.maxAge),
        parseInt(params.diagnosisCode)
      );
    } else if (queryType === 'count') {
      res = await countPatientsByCriteria(
        parseInt(params.diagnosisCode),
        parseInt(params.minOutcome)
      );
    } else if (queryType === 'individual') {
      res = await queryIndividualRecords(
        parseInt(params.diagnosisCode),
        parseInt(params.minAge),
        parseInt(params.maxAge),
        parseInt(params.maxResults || 10)
      );
    }

    setResult(res);
  };

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="h-20 w-20 text-yellow-500 mx-auto mb-6" />
        <h1 className="text-4xl font-bold mb-4">Connect Wallet</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Please connect your wallet to execute queries
        </p>
      </div>
    );
  }

  return (
    <ConsentGate type="researcher">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link
          href="/researcher"
          className="inline-flex items-center space-x-2 text-primary-500 hover:text-primary-600 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Execute Query</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Query encrypted patient data without ever decrypting it
        </p>
      </div>

      {result && (
        <div className={`mb-6 p-4 rounded-lg border ${
          result.success
            ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
            : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
        }`}>
          <div className="flex items-start space-x-2">
            {result.success ? (
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Query executed successfully!</span>
                </div>
                <div className="text-sm ml-7 space-y-1">
                  <p>Query ID: {result.queryId}</p>
                  {result.matchCount !== undefined && (
                    <p>Matching Records: {result.matchCount}</p>
                  )}
                  {result.kAnonymityMet !== undefined && (
                    <p className="flex items-center space-x-1">
                      <FileText className="h-4 w-4" />
                      <span>
                        Individual Access: {result.kAnonymityMet ? 'Granted ✓' : 'Denied (insufficient matches)'}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5" />
                <span>Error: {result.error}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="glass-morphism rounded-xl p-8 border border-primary-500/20">
        <QueryBuilder 
          onSubmit={handleSubmit} 
          isLoading={isLoading} 
          queryFee={queryFee} 
          individualQueryFee={individualQueryFee}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 glass-morphism rounded-xl border border-primary-500/20">
          <h3 className="font-semibold mb-3">Privacy Guarantee</h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start space-x-2">
              <span className="text-primary-500 mt-1">•</span>
              <span>Queries execute on encrypted data using FHE</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-primary-500 mt-1">•</span>
              <span>No raw patient data is ever exposed</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-primary-500 mt-1">•</span>
              <span>Results are encrypted until you decrypt them</span>
            </li>
          </ul>
        </div>

        <div className="p-6 glass-morphism rounded-xl border border-primary-500/20">
          <h3 className="font-semibold mb-3">Payment Info</h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start space-x-2">
              <span className="text-primary-500 mt-1">•</span>
              <span>Query fee: {queryFee} ETH per query</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-primary-500 mt-1">•</span>
              <span>70% distributed to contributing patients</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-primary-500 mt-1">•</span>
              <span>30% platform fee for infrastructure</span>
            </li>
          </ul>
        </div>
      </div>
      </div>
    </ConsentGate>
  );
}