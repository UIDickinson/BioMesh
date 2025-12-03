'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useResearchOracle } from '@/hooks/useResearchOracle';
import { usePaymentProcessor } from '@/hooks/usePaymentProcessor';
import Link from 'next/link';
import StatsCard from '@/components/StatsCard';
import { FlaskConical, Search, TrendingUp, ArrowRight } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function ResearcherDashboard() {
  const { signer, address, isConnected } = useWallet();
  const { getResearcherQueries, getTotalQueries } = useResearchOracle(signer);
  const { getResearcherSpending } = usePaymentProcessor(signer);
  const [stats, setStats] = useState({
    totalQueries: 0,
    myQueries: 0,
    totalSpent: '0.00'
  });
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    if (!signer || !address) return;
    
    setLoading(true);
    try {
      const [myQueryIds, totalQueries, spending] = await Promise.all([
        getResearcherQueries(address),
        getTotalQueries(),
        getResearcherSpending(address)
      ]);
      
      setStats({
        totalQueries: totalQueries,
        myQueries: myQueryIds.length,
        totalSpent: parseFloat(spending).toFixed(4)
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  }, [signer, address, getResearcherQueries, getTotalQueries, getResearcherSpending]);

  useEffect(() => {
    if (isConnected && signer && address) {
      loadStats();
    }
  }, [isConnected, signer, address, loadStats]);

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <FlaskConical className="h-20 w-20 text-primary-500 mx-auto mb-6" />
        <h1 className="text-4xl font-bold mb-4">Researcher Portal</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Connect your wallet to access the research dashboard
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Researcher Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Execute encrypted queries on clinical trial data
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatsCard
            title="Platform Queries"
            value={stats.totalQueries}
            icon={Search}
          />
          <StatsCard
            title="My Queries"
            value={stats.myQueries}
            icon={FlaskConical}
            gradient
          />
          <StatsCard
            title="Total Spent"
            value={`${stats.totalSpent} ETH`}
            icon={TrendingUp}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/researcher/query"
          className="group card-3d p-8 glass-morphism rounded-xl border border-primary-500/20 hover:border-primary-500/40 transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Execute Query</h2>
            <ArrowRight className="h-6 w-6 text-primary-500 group-hover:translate-x-2 transition-transform" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Run encrypted queries on patient health data without decryption
          </p>
        </Link>

        <Link
          href="/researcher/results"
          className="group card-3d p-8 glass-morphism rounded-xl border border-primary-500/20 hover:border-primary-500/40 transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Query Results</h2>
            <ArrowRight className="h-6 w-6 text-primary-500 group-hover:translate-x-2 transition-transform" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            View results and history of your executed queries
          </p>
        </Link>

        <Link
          href="/researcher/spending"
          className="group card-3d p-8 glass-morphism rounded-xl border border-primary-500/20 hover:border-primary-500/40 transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Spending</h2>
            <ArrowRight className="h-6 w-6 text-primary-500 group-hover:translate-x-2 transition-transform" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Track your query spending and payment history
          </p>
        </Link>
      </div>

      <div className="mt-12 glass-morphism rounded-xl p-8 border border-primary-500/20">
        <h2 className="text-2xl font-bold mb-4">Available Query Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white/5 dark:bg-black/20 rounded-lg">
            <h3 className="font-semibold text-lg mb-2 text-primary-500">Average Biomarker</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Calculate average biomarker values for patients matching age range and diagnosis
            </p>
            <div className="text-xs space-y-1">
              <p><span className="text-primary-500">Parameters:</span> Min Age, Max Age, Diagnosis Code</p>
              <p><span className="text-primary-500">Returns:</span> Encrypted average value</p>
            </div>
          </div>

          <div className="p-6 bg-white/5 dark:bg-black/20 rounded-lg">
            <h3 className="font-semibold text-lg mb-2 text-primary-500">Count Patients</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Count patients by diagnosis code and minimum treatment outcome
            </p>
            <div className="text-xs space-y-1">
              <p><span className="text-primary-500">Parameters:</span> Diagnosis Code, Min Outcome</p>
              <p><span className="text-primary-500">Returns:</span> Encrypted patient count</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}