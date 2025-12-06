'use client';

import { useState } from 'react';
import { Search, Loader2, Database, Users, FileText } from 'lucide-react';

export default function QueryBuilder({ onSubmit, isLoading, queryFee, individualQueryFee }) {
  const [queryType, setQueryType] = useState('average');
  const [params, setParams] = useState({
    minAge: '',
    maxAge: '',
    diagnosisCode: '',
    minOutcome: '',
    maxResults: '10'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(queryType, params);
  };

  const currentFee = queryType === 'individual' ? (individualQueryFee || queryFee) : queryFee;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Query Type</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setQueryType('average')}
            disabled={isLoading}
            className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center space-y-2 ${
              queryType === 'average' 
                ? 'border-primary-500 bg-primary-500/10' 
                : 'border-gray-300 dark:border-gray-600 hover:border-primary-300'
            }`}
          >
            <Database className={`h-6 w-6 ${queryType === 'average' ? 'text-primary-500' : 'text-gray-400'}`} />
            <span className="font-medium">Average Biomarker</span>
            <span className="text-xs text-gray-500">Aggregate statistics</span>
          </button>
          
          <button
            type="button"
            onClick={() => setQueryType('count')}
            disabled={isLoading}
            className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center space-y-2 ${
              queryType === 'count' 
                ? 'border-primary-500 bg-primary-500/10' 
                : 'border-gray-300 dark:border-gray-600 hover:border-primary-300'
            }`}
          >
            <Users className={`h-6 w-6 ${queryType === 'count' ? 'text-primary-500' : 'text-gray-400'}`} />
            <span className="font-medium">Count Patients</span>
            <span className="text-xs text-gray-500">Patient counts</span>
          </button>
          
          <button
            type="button"
            onClick={() => setQueryType('individual')}
            disabled={isLoading}
            className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center space-y-2 ${
              queryType === 'individual' 
                ? 'border-green-500 bg-green-500/10' 
                : 'border-gray-300 dark:border-gray-600 hover:border-green-300'
            }`}
          >
            <FileText className={`h-6 w-6 ${queryType === 'individual' ? 'text-green-500' : 'text-gray-400'}`} />
            <span className="font-medium">Individual Records</span>
            <span className="text-xs text-gray-500">Anonymized data</span>
          </button>
        </div>
      </div>

      {queryType === 'average' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Min Age</label>
              <input
                type="number"
                value={params.minAge}
                onChange={(e) => setParams({ ...params, minAge: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-primary-500/20 focus:border-primary-500 outline-none"
                placeholder="e.g., 30"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max Age</label>
              <input
                type="number"
                value={params.maxAge}
                onChange={(e) => setParams({ ...params, maxAge: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-primary-500/20 focus:border-primary-500 outline-none"
                placeholder="e.g., 60"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Diagnosis Code</label>
            <input
              type="number"
              value={params.diagnosisCode}
              onChange={(e) => setParams({ ...params, diagnosisCode: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-primary-500/20 focus:border-primary-500 outline-none"
              placeholder="e.g., 250 for diabetes"
              required
              disabled={isLoading}
            />
          </div>
        </>
      ) : queryType === 'count' ? (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">Diagnosis Code</label>
            <input
              type="number"
              value={params.diagnosisCode}
              onChange={(e) => setParams({ ...params, diagnosisCode: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-primary-500/20 focus:border-primary-500 outline-none"
              placeholder="e.g., 250"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Min Outcome</label>
            <input
              type="number"
              value={params.minOutcome}
              onChange={(e) => setParams({ ...params, minOutcome: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-primary-500/20 focus:border-primary-500 outline-none"
              placeholder="e.g., 50"
              required
              disabled={isLoading}
            />
          </div>
        </>
      ) : (
        /* Individual Records Query */
        <>
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">
              ℹ️ Individual records query returns anonymized patient data from consenting patients only.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Diagnosis Code</label>
            <input
              type="number"
              value={params.diagnosisCode}
              onChange={(e) => setParams({ ...params, diagnosisCode: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-primary-500/20 focus:border-primary-500 outline-none"
              placeholder="e.g., 250 for diabetes"
              required
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Min Age</label>
              <input
                type="number"
                value={params.minAge}
                onChange={(e) => setParams({ ...params, minAge: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-primary-500/20 focus:border-primary-500 outline-none"
                placeholder="e.g., 18"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max Age</label>
              <input
                type="number"
                value={params.maxAge}
                onChange={(e) => setParams({ ...params, maxAge: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-primary-500/20 focus:border-primary-500 outline-none"
                placeholder="e.g., 65"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Results</label>
            <input
              type="number"
              value={params.maxResults}
              onChange={(e) => setParams({ ...params, maxResults: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-primary-500/20 focus:border-primary-500 outline-none"
              placeholder="e.g., 10"
              max="100"
              required
              disabled={isLoading}
            />
          </div>
        </>
      )}

      <div className="p-4 bg-primary-500/10 rounded-lg border border-primary-500/20">
        <p className="text-sm">
          Query Fee: <span className="font-bold text-primary-500">{currentFee} ETH</span>
          {queryType === 'individual' && (
            <span className="ml-2 text-xs text-gray-500">(Individual records access)</span>
          )}
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-primary-500/50 disabled:opacity-50 flex items-center justify-center space-x-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Executing Query...</span>
          </>
        ) : (
          <>
            <Search className="h-5 w-5" />
            <span>Execute Query</span>
          </>
        )}
      </button>
    </form>
  );
}