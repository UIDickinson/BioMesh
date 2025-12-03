'use client';

import { useState } from 'react';
import { FileText, Clock, CheckCircle, XCircle, Trash2, ExternalLink } from 'lucide-react';

export default function RecordCard({ record, onRevoke }) {
  const [isRevoking, setIsRevoking] = useState(false);

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to revoke this record? This action cannot be undone.')) {
      return;
    }
    
    setIsRevoking(true);
    try {
      await onRevoke?.();
    } finally {
      setIsRevoking(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = () => {
    if (record.isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle className="h-3 w-3" />
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
        <XCircle className="h-3 w-3" />
        Revoked
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <FileText className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Record #{record.id}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4" />
              <span>{formatDate(record.timestamp)}</span>
            </div>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Patient</span>
            <p className="font-mono text-xs mt-1 text-gray-900 dark:text-white truncate">
              {record.patient}
            </p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Data</span>
            <p className="text-gray-900 dark:text-white mt-1">
              🔒 Encrypted
            </p>
          </div>
        </div>
      </div>

      {record.isActive && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <a
            href={`https://sepolia.etherscan.io/address/${record.patient}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-500 hover:text-primary-600 inline-flex items-center gap-1"
          >
            View on Explorer
            <ExternalLink className="h-3 w-3" />
          </a>
          
          <button
            onClick={handleRevoke}
            disabled={isRevoking}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRevoking ? (
              <>
                <div className="h-4 w-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                Revoking...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Revoke Access
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}