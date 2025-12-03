'use client';

import { Lock, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { formatTimestamp, formatAddress } from '@/lib/utils';

export default function QueryResults({ queries, onDecrypt }) {
  if (!queries || queries.length === 0) {
    return (
      <div className="text-center py-12">
        <Lock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">No query results yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {queries.map((query, index) => (
        <QueryResultCard
          key={query.id || index}
          query={query}
          onDecrypt={onDecrypt}
        />
      ))}
    </div>
  );
}

function QueryResultCard({ query, onDecrypt }) {
  const getStatusBadge = () => {
    if (query.isComplete) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle className="h-3 w-3" />
          Complete
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        <Clock className="h-3 w-3" />
        Processing
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Query #{query.id}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatTimestamp(query.timestamp)}
          </p>
        </div>
        {getStatusBadge()}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Researcher</span>
          <p className="font-mono text-xs mt-1 text-gray-900 dark:text-white">
            {formatAddress(query.researcher)}
          </p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Records Used</span>
          <p className="text-gray-900 dark:text-white mt-1">
            {query.recordCount || 'N/A'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
        <Lock className="h-4 w-4" />
        <span>Result is encrypted</span>
      </div>

      <div className="flex gap-3">
        {query.isComplete && onDecrypt && (
          <button
            onClick={() => onDecrypt(query.id)}
            className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Decrypt Result
          </button>
        )}
        {query.txHash && (
          <a
            href={`https://sepolia.etherscan.io/tx/${query.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-4 py-2 text-sm text-primary-500 hover:text-primary-600"
          >
            View TX
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}