'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useResearchOracle } from '@/hooks/useResearchOracle';
import { ArrowLeft, Search, Lock, RefreshCw, Unlock, CheckCircle, Loader2 } from 'lucide-react';
import { formatTimestamp } from '@/lib/utils';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ResultsPage() {
  const { signer, address, isConnected } = useWallet();
  const { 
    getResearcherQueries, 
    getQueryResult, 
    requestDecryption,
    getDecryptedResult,
    isLoading: hookLoading 
  } = useResearchOracle(signer);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [decryptingId, setDecryptingId] = useState(null);

  const loadQueries = useCallback(async () => {
    if (!signer || !address) return;
    
    setLoading(true);
    try {
      const queryIds = await getResearcherQueries(address);
      
      // Fetch details for each query, including decrypted results
      const queryDetails = await Promise.all(
        queryIds.map(async (id) => {
          const result = await getQueryResult(id);
          if (!result) return null;
          
          // If already decrypted, get the decrypted values
          let decryptedData = null;
          if (result.isDecrypted) {
            decryptedData = await getDecryptedResult(id);
          }
          
          return { 
            id, 
            ...result,
            decryptedData
          };
        })
      );
      
      // Filter out nulls and sort by timestamp (newest first)
      const validQueries = queryDetails
        .filter(q => q !== null)
        .sort((a, b) => b.timestamp - a.timestamp);
      
      setQueries(validQueries);
    } catch (err) {
      console.error('Error loading queries:', err);
    } finally {
      setLoading(false);
    }
  }, [signer, address, getResearcherQueries, getQueryResult, getDecryptedResult]);

  useEffect(() => {
    if (isConnected && signer && address) {
      loadQueries();
    }
  }, [isConnected, signer, address, loadQueries]);

  const handleRequestDecryption = async (queryId) => {
    setDecryptingId(queryId);
    try {
      const result = await requestDecryption(queryId);
      if (result.success) {
        // Reload queries to get updated status
        await loadQueries();
      } else {
        alert('Failed to request decryption: ' + result.error);
      }
    } catch (err) {
      console.error('Error requesting decryption:', err);
      alert('Error requesting decryption');
    } finally {
      setDecryptingId(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Connect your wallet to view query results
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Link
        href="/researcher"
        className="inline-flex items-center space-x-2 text-primary-500 hover:text-primary-600 mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Dashboard</span>
      </Link>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Query Results</h1>
          <p className="text-gray-600 dark:text-gray-400">
            View and decrypt your query results
          </p>
        </div>
        <button
          onClick={loadQueries}
          disabled={loading}
          className="p-2 rounded-lg bg-primary-500/10 hover:bg-primary-500/20 text-primary-500 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" />
      ) : queries.length === 0 ? (
        <div className="text-center py-20">
          <Search className="h-20 w-20 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">No queries executed yet</p>
          <Link
            href="/researcher/query"
            className="inline-block px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all"
          >
            Execute Your First Query
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {queries.map((query) => (
            <div
              key={query.id}
              className="card-3d p-6 glass-morphism rounded-xl border border-primary-500/20"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Query #{query.id}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Executed: {formatTimestamp(query.timestamp)}
                  </p>
                </div>
                {query.isDecrypted ? (
                  <span className="px-3 py-1 rounded-full text-sm bg-green-500/20 text-green-600 dark:text-green-400 flex items-center space-x-1">
                    <CheckCircle className="h-4 w-4" />
                    <span>Decrypted</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-sm bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 flex items-center space-x-1">
                    <Lock className="h-4 w-4" />
                    <span>Encrypted</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Records Processed</p>
                  <p className="font-semibold">{query.recordCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <p className="font-semibold">{query.isDecrypted ? 'Ready' : 'Pending Decryption'}</p>
                </div>
                {query.isDecrypted && query.decryptedData && (
                  <>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Matching Count</p>
                      <p className="font-semibold text-primary-500">{query.decryptedData.count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Average Value</p>
                      <p className="font-semibold text-primary-500">
                        {query.decryptedData.count > 0 ? query.decryptedData.average : 'N/A'}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Decrypted Results Display */}
              {query.isDecrypted && query.decryptedData && query.decryptedData.isReady && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center space-x-2">
                    <Unlock className="h-4 w-4" />
                    <span>Decrypted Results</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Total Sum</p>
                      <p className="font-bold text-lg">{query.decryptedData.sum.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Match Count</p>
                      <p className="font-bold text-lg">{query.decryptedData.count}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Average</p>
                      <p className="font-bold text-lg text-primary-500">
                        {query.decryptedData.count > 0 
                          ? query.decryptedData.average.toLocaleString() 
                          : 'No matches'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Decrypt Button */}
              {!query.isDecrypted && (
                <button
                  onClick={() => handleRequestDecryption(query.id)}
                  disabled={decryptingId === query.id || hookLoading}
                  className="w-full py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {decryptingId === query.id ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Decrypting...</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="h-5 w-5" />
                      <span>Decrypt Results</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-6 glass-morphism rounded-xl border border-primary-500/20">
        <h3 className="font-semibold mb-3 flex items-center space-x-2">
          <Lock className="h-5 w-5 text-primary-500" />
          <span>How Decryption Works</span>
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            <strong>1. Query Execution:</strong> Your query computes statistics on encrypted patient data. 
            The results remain encrypted on-chain.
          </p>
          <p>
            <strong>2. Request Decryption:</strong> Click "Decrypt Results" to request decryption from the 
            Zama Gateway service. This marks your encrypted values as publicly decryptable.
          </p>
          <p>
            <strong>3. View Results:</strong> Once decrypted, you can see the actual computed values 
            (sum, count, average) while individual patient data remains private.
          </p>
        </div>
      </div>
    </div>
  );
}