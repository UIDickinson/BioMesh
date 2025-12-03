'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useResearchOracle } from '@/hooks/useResearchOracle';
import { ArrowLeft, Search, Lock, RefreshCw } from 'lucide-react';
import { formatTimestamp } from '@/lib/utils';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ResultsPage() {
  const { signer, address, isConnected } = useWallet();
  const { getResearcherQueries, getQueryResult } = useResearchOracle(signer);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadQueries = useCallback(async () => {
    if (!signer || !address) return;
    
    setLoading(true);
    try {
      const queryIds = await getResearcherQueries(address);
      
      // Fetch details for each query
      const queryDetails = await Promise.all(
        queryIds.map(async (id) => {
          const result = await getQueryResult(id);
          return result ? { id, ...result } : null;
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
  }, [signer, address, getResearcherQueries, getQueryResult]);

  useEffect(() => {
    if (isConnected && signer && address) {
      loadQueries();
    }
  }, [isConnected, signer, address, loadQueries]);

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
            View your executed queries and encrypted results
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
                <span className="px-3 py-1 rounded-full text-sm bg-green-500/20 text-green-600 dark:text-green-400">
                  Complete
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Records Processed</p>
                  <p className="font-semibold">{query.recordCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <p className="font-semibold">{query.isDecrypted ? 'Decrypted' : 'Encrypted'}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Lock className="h-4 w-4" />
                <span>Encrypted result stored on-chain</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-6 glass-morphism rounded-xl border border-primary-500/20">
        <h3 className="font-semibold mb-3 flex items-center space-x-2">
          <Lock className="h-5 w-5 text-primary-500" />
          <span>About Encrypted Results</span>
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Query results are encrypted and only you can decrypt them. The blockchain stores the encrypted output, 
          ensuring data privacy while maintaining result integrity. To decrypt, you'll need to request decryption 
          via the Zama Gateway service.
        </p>
      </div>
    </div>
  );
}