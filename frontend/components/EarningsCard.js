'use client';

import { Coins, TrendingUp, ArrowUpRight } from 'lucide-react';

export default function EarningsCard({ earnings, onWithdraw, isWithdrawing }) {
  const hasEarnings = parseFloat(earnings || '0') > 0;

  return (
    <div className="bg-gradient-to-br from-primary-500/10 to-primary-600/10 rounded-xl border border-primary-500/20 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-primary-500/20 rounded-lg">
          <Coins className="h-8 w-8 text-primary-500" />
        </div>
        {hasEarnings && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <TrendingUp className="h-3 w-3" />
            Available
          </span>
        )}
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Available Earnings
        </p>
        <p className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          {parseFloat(earnings || '0').toFixed(6)} ETH
        </p>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        <p>70% of query fees go directly to you</p>
      </div>

      {onWithdraw && (
        <button
          onClick={onWithdraw}
          disabled={!hasEarnings || isWithdrawing}
          className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isWithdrawing ? (
            <>
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ArrowUpRight className="h-4 w-4" />
              Withdraw to Wallet
            </>
          )}
        </button>
      )}

      {!hasEarnings && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
          No earnings available yet
        </p>
      )}
    </div>
  );
}