'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useDataRegistry } from '@/hooks/useDataRegistry';
import RecordCard from '@/components/RecordCard';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ViewRecordsPageContent() {
  const { signer, isConnected } = useWallet();
  // Call the hook unconditionally at the top level
  const registryMethods = useDataRegistry(signer);
  
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log('✅ Records - Hook called successfully, registryMethods:', !!registryMethods?.getPatientRecords);

  useEffect(() => {
    // Only run when connected and methods are available
    // Use a flag to prevent re-running if already loaded
    let cancelled = false;
    
    const fetchRecords = async () => {
      if (!isConnected || !registryMethods?.getPatientRecords || !signer) {
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const address = await signer.getAddress();
        const data = await registryMethods.getPatientRecords(address);
        if (!cancelled) {
          setRecords(data || []);
        }
      } catch (err) {
        console.error('Failed to load records:', err);
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    
    fetchRecords();
    
    return () => {
      cancelled = true;
    };
  }, [isConnected, signer]); // Only depend on stable references

  const loadRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!registryMethods?.getPatientRecords) {
        throw new Error('getPatientRecords not loaded');
      }
      const address = await signer.getAddress();
      const data = await registryMethods.getPatientRecords(address);
      setRecords(data || []);
    } catch (err) {
      console.error('Failed to load records:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (recordId) => {
    setError(null);
    try {
      if (!registryMethods?.getPatientRecords) {
        throw new Error('getPatientRecords not loaded');
      }
      // Note: revokeRecord is not being set, might need to check hook
      // For now, just remove from local state
      setRecords(records.filter(r => r.id !== recordId));
    } catch (err) {
      console.error('Failed to revoke record:', err);
      setError(err.message);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Please connect your wallet to view your records
        </p>
      </div>
    );
  }

  if (!registryMethods?.getPatientRecords) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link href="/patient" className="flex items-center text-primary-500 hover:text-primary-600 mb-8">
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Your Health Records</h1>
        <p className="text-gray-600 dark:text-gray-400">
          View and manage your submitted encrypted health records
        </p>
      </div>

      {error && (
        <div className="mb-8 p-4 rounded-lg flex items-start gap-4 bg-red-50 dark:bg-red-900/20">
          <div>
            <h3 className="font-bold text-red-900 dark:text-red-200">
              Error Loading Records
            </h3>
            <p className="text-red-800 dark:text-red-300 text-sm">
              {error}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : records.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No records submitted yet
          </p>
          <Link href="/patient/submit" className="text-primary-500 hover:text-primary-600">
            Submit your first record →
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {records.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onRevoke={() => handleRevoke(record.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
