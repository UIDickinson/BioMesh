'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useResearchOracle } from '@/hooks/useResearchOracle';
import { useUserDecryption } from '@/hooks/useUserDecryption';
import { ArrowLeft, Search, Lock, RefreshCw, Unlock, CheckCircle, Loader2, Zap } from 'lucide-react';
import { formatTimestamp } from '@/lib/utils';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ResultsPage() {
  const { signer, address, isConnected } = useWallet();
  const { 
    getResearcherQueries, 
    getQueryResult,
    isLoading: hookLoading 
  } = useResearchOracle(signer);
  const { 
    isInitialized: fheReady, 
    isDecrypting, 
    decryptQueryResults,
    error: decryptError 
  } = useUserDecryption(signer);
  
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [decryptingId, setDecryptingId] = useState(null);
  const [decryptedResults, setDecryptedResults] = useState({});

  const loadQueries = useCallback(async () => {
    if (!signer || !address) return;
    
    setLoading(true);
    try {
      const queryIds = await getResearcherQueries(address);
      
      const queryDetails = await Promise.all(
        queryIds.map(async (id) => {
          const result = await getQueryResult(id);
          if (!result) return null;
          return { id, ...result };
        })
      );
      
      const validQueries = queryDetails
        .filter(q => q !== null)
        .sort((a, b) => b.timestamp - a.timestamp);
      
      setQueries(validQueries);
    } catch (err) {
      console.error('Error loading queries:', err);
    } finally {
      setLoading(false);
    }
  }, [signer, address, getResearcherQueries, getQueryResult]);

  useEffect(() => {
    if (isConnected && signer && address) {
      loadQueries();
    }
  }, [isConnected, signer, address, loadQueries]);

  const handleInstantDecrypt = async (queryId, encryptedSum, encryptedCount) => {
    setDecryptingId(queryId);
    try {
      console.log('Starting instant decryption for query:', queryId);
      
      const result = await decryptQueryResults(encryptedSum, encryptedCount);
      
      setDecryptedResults(prev => ({
        ...prev,
        [queryId]: {
          sum: result.sum.toString(),
          count: result.count,
          average: result.average,
          isReady: true,
        }
      }));
      
      console.log('Decryption complete for query:', queryId);
    } catch (err) {
      console.error('Error decrypting:', err);
      alert('Failed to decrypt: ' + (err.message || 'Unknown error'));
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
            View and decrypt your query results instantly
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

      {fheReady && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center space-x-3">
          <Zap className="h-5 w-5 text-green-500" />
          <div>
            <p className="font-semibold text-green-600 dark:text-green-400">
              Instant Decryption Ready
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              User Decryption via EIP-712 - Results in 2-5 seconds!
            </p>
          </div>
        </div>
      )}

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
          {queries.map((query) => {
            const decrypted = decryptedResults[query.id];
            const isDecryptedNow = !!decrypted?.isReady;
            
            return (
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
                  {isDecryptedNow ? (
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
                    <p className="font-semibold">
                      {isDecryptedNow ? 'Ready' : 'Encrypted'}
                    </p>
                  </div>
                  {isDecryptedNow && (
                    <>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Match Count</p>
                        <p className="font-semibold text-primary-500">{decrypted.count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Average Value</p>
                        <p className="font-semibold text-primary-500">
                          {decrypted.count > 0 ? decrypted.average : 'N/A'}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {isDecryptedNow && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center space-x-2">
                      <Unlock className="h-4 w-4" />
                      <span>Decrypted Results</span>
                    </h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Total Sum</p>
                        <p className="font-bold text-lg">{Number(decrypted.sum).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Match Count</p>
                        <p className="font-bold text-lg">{decrypted.count}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Average</p>
                        <p className="font-bold text-lg text-primary-500">
                          {decrypted.count > 0 ? decrypted.average.toLocaleString() : 'No matches'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!isDecryptedNow && (
                  <button
                    onClick={() => handleInstantDecrypt(query.id, query.encryptedSum, query.encryptedCount)}
                    disabled={decryptingId === query.id || !fheReady}
                    className="w-full py-3 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-lg hover:from-primary-600 hover:to-purple-600 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {decryptingId === query.id ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Decrypting... (2-5 seconds)</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5" />
                        <span>Instant Decrypt (EIP-712)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 p-6 glass-morphism rounded-xl border border-primary-500/20">
        <h3 className="font-semibold mb-3 flex items-center space-x-2">
          <Zap className="h-5 w-5 text-primary-500" />
          <span>How Instant Decryption Works</span>
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            <strong>1. Query Execution:</strong> Your query computes statistics on encrypted patient data. 
            The results remain encrypted on-chain using Fully Homomorphic Encryption.
          </p>
          <p>
            <strong>2. User Decryption:</strong> Click Instant Decrypt to sign an EIP-712 message.
            This grants you permission to decrypt YOUR results only.
          </p>
          <p>
            <strong>3. Zama Relayer:</strong> The signed request is sent to Zama relayer service,
            which decrypts the values and returns them in 2-5 seconds.
          </p>
          <p>
            <strong>4. View Results:</strong> See the actual computed values 
            (sum, count, average) while individual patient data remains private.
          </p>
          <p className="text-green-500 mt-3">
            <strong>Bonus:</strong> Your signature is cached for 365 days - you only need to sign once per year!
          </p>
        </div>
      </div>
    </div>
  );
}
