'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatsCard from '@/components/StatsCard';
import { FileText, Coins, Database, ArrowRight } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function PatientDashboardContent() {
  const [wallet, setWallet] = useState(null);
  const [records, setRecords] = useState([]);
  const [earnings, setEarnings] = useState('0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load hooks only after component mounts
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Lazy load wallet hook
      const { useWallet } = await import('@/hooks/useWallet');
      // Note: We can't use hooks after they're loaded in useEffect
      // So we need to restructure this differently
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent mb-4">
            Patient Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Manage your health records and earnings
          </p>
        </div>

        {/* Loading State */}
        {loading && <LoadingSpinner />}

        {/* Stats Cards */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <StatsCard
              icon={FileText}
              title="Records Submitted"
              value={records.length.toString()}
            />
            <StatsCard
              icon={Coins}
              title="Total Earnings"
              value={`$${earnings}`}
            />
            <StatsCard
              icon={Database}
              title="Active Studies"
              value="3"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/patient/submit" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 hover:shadow-xl transition-all transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <FileText className="h-8 w-8 text-primary-500" />
                <ArrowRight className="h-5 w-5 text-primary-500 transform group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-2">Submit Records</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Add new health records to the marketplace
              </p>
            </div>
          </Link>

          <Link href="/patient/records" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 hover:shadow-xl transition-all transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <Database className="h-8 w-8 text-primary-500" />
                <ArrowRight className="h-5 w-5 text-primary-500 transform group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-2">View Records</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Manage your submitted health records
              </p>
            </div>
          </Link>

          <Link href="/patient/earnings" className="group">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 hover:shadow-xl transition-all transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <Coins className="h-8 w-8 text-primary-500" />
                <ArrowRight className="h-5 w-5 text-primary-500 transform group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-2">Earnings</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Track your earnings from research participation
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
