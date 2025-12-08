'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldOff,
  Clock,
  Award,
  TrendingUp,
  Coins,
  FileCheck,
  AlertTriangle,
  User
} from 'lucide-react';
import { 
  VerificationStatus as Status,
  getStatusLabel,
  getStatusColor,
  getEvidenceTypeLabel
} from '@/hooks/useVerification';

/**
 * Trust Score Badge Component
 * Shows a circular trust score indicator
 */
export function TrustScoreBadge({ score, size = 'md' }) {
  const sizes = {
    sm: { container: 'w-12 h-12', text: 'text-sm', label: 'text-xs' },
    md: { container: 'w-16 h-16', text: 'text-lg', label: 'text-xs' },
    lg: { container: 'w-20 h-20', text: 'text-xl', label: 'text-sm' }
  };
  
  const s = sizes[size] || sizes.md;
  
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500 border-green-500';
    if (score >= 60) return 'text-yellow-500 border-yellow-500';
    if (score >= 40) return 'text-orange-500 border-orange-500';
    return 'text-red-500 border-red-500';
  };
  
  return (
    <div className={`${s.container} rounded-full border-4 ${getScoreColor(score)} flex flex-col items-center justify-center bg-white dark:bg-gray-800`}>
      <span className={`font-bold ${s.text}`}>{score}</span>
      <span className={`${s.label} text-gray-500`}>Trust</span>
    </div>
  );
}

/**
 * Reputation Score Display
 */
export function ReputationDisplay({ reputation }) {
  if (!reputation) return null;
  
  const score = reputation.reputationScore;
  
  const getScoreLevel = (score) => {
    if (score >= 90) return { label: 'Excellent', color: 'emerald' };
    if (score >= 70) return { label: 'Good', color: 'green' };
    if (score >= 50) return { label: 'Fair', color: 'yellow' };
    if (score >= 30) return { label: 'Low', color: 'orange' };
    return { label: 'Poor', color: 'red' };
  };
  
  const level = getScoreLevel(score);
  
  const colorClasses = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  };
  
  return (
    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Award className="h-5 w-5 text-primary-500" />
          <span className="font-medium">Reputation Score</span>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClasses[level.color]}`}>
          {level.label}
        </span>
      </div>
      
      {/* Score bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-500">Score</span>
          <span className="font-semibold">{score.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${
              score >= 70 ? 'bg-green-500' :
              score >= 50 ? 'bg-yellow-500' :
              score >= 30 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 bg-white dark:bg-gray-900 rounded">
          <div className="font-semibold text-green-600">{reputation.verifiedCount}</div>
          <div className="text-gray-500">Verified</div>
        </div>
        <div className="p-2 bg-white dark:bg-gray-900 rounded">
          <div className="font-semibold text-yellow-600">{reputation.flaggedCount}</div>
          <div className="text-gray-500">Flagged</div>
        </div>
        <div className="p-2 bg-white dark:bg-gray-900 rounded">
          <div className="font-semibold text-gray-600">{reputation.totalSubmissions}</div>
          <div className="text-gray-500">Total</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Verification Status Card
 * Shows full verification details for a record
 */
export function VerificationCard({ verification, trustScore }) {
  if (!verification) return null;
  
  const statusIcons = {
    [Status.Unverified]: Shield,
    [Status.Pending]: Clock,
    [Status.AIVerified]: ShieldCheck,
    [Status.ProviderAttested]: ShieldCheck,
    [Status.Flagged]: ShieldAlert,
    [Status.Slashed]: ShieldOff
  };
  
  const statusColors = {
    [Status.Unverified]: 'text-gray-400 bg-gray-100 dark:bg-gray-800',
    [Status.Pending]: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
    [Status.AIVerified]: 'text-green-500 bg-green-100 dark:bg-green-900/30',
    [Status.ProviderAttested]: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30',
    [Status.Flagged]: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30',
    [Status.Slashed]: 'text-red-500 bg-red-100 dark:bg-red-900/30'
  };
  
  const Icon = statusIcons[verification.status] || Shield;
  const colorClass = statusColors[verification.status] || statusColors[Status.Unverified];
  
  return (
    <div className="p-4 rounded-lg border bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="font-medium">{getStatusLabel(verification.status)}</div>
            <div className="text-xs text-gray-500">
              {verification.verificationTimestamp > 0 
                ? new Date(verification.verificationTimestamp * 1000).toLocaleDateString()
                : 'Not verified yet'}
            </div>
          </div>
        </div>
        
        {trustScore !== null && trustScore !== undefined && (
          <TrustScoreBadge score={trustScore} size="sm" />
        )}
      </div>
      
      {/* Details */}
      <div className="space-y-3 text-sm">
        {/* Stake */}
        {parseFloat(verification.stakeAmount) > 0 && (
          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="flex items-center space-x-2">
              <Coins className="h-4 w-4 text-yellow-500" />
              <span>Stake Deposited</span>
            </div>
            <span className="font-medium">{verification.stakeAmount} ETH</span>
          </div>
        )}
        
        {/* AI Confidence */}
        {verification.aiConfidenceScore > 0 && (
          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="flex items-center space-x-2">
              <FileCheck className="h-4 w-4 text-blue-500" />
              <span>AI Confidence</span>
            </div>
            <span className={`font-medium ${
              verification.aiConfidenceScore >= 70 ? 'text-green-600' : 'text-orange-600'
            }`}>
              {verification.aiConfidenceScore}%
            </span>
          </div>
        )}
        
        {/* Evidence Type */}
        {verification.evidenceType > 0 && (
          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <span className="text-gray-500">Document Type</span>
            <span className="font-medium">{getEvidenceTypeLabel(verification.evidenceType)}</span>
          </div>
        )}
        
        {/* Provider Attestation */}
        {verification.attestingProvider && verification.attestingProvider !== '0x0000000000000000000000000000000000000000' && (
          <div className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-emerald-500" />
              <span>Provider Attested</span>
            </div>
            <span className="font-mono text-xs">
              {verification.attestingProvider.slice(0, 6)}...{verification.attestingProvider.slice(-4)}
            </span>
          </div>
        )}
        
        {/* Extraction Summary */}
        {verification.aiExtractionSummary && (
          <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-xs text-gray-500 mb-1">AI Extraction Summary</div>
            <div className="text-xs font-mono break-all">{verification.aiExtractionSummary}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact verification badge for lists
 */
export function VerificationBadge({ status, size = 'md' }) {
  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };
  
  const s = sizes[size] || sizes.md;
  
  const colorClasses = {
    [Status.Unverified]: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    [Status.Pending]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    [Status.AIVerified]: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    [Status.ProviderAttested]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    [Status.Flagged]: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    [Status.Slashed]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  };
  
  const icons = {
    [Status.Unverified]: Shield,
    [Status.Pending]: Clock,
    [Status.AIVerified]: ShieldCheck,
    [Status.ProviderAttested]: ShieldCheck,
    [Status.Flagged]: ShieldAlert,
    [Status.Slashed]: ShieldOff
  };
  
  const Icon = icons[status] || Shield;
  const colorClass = colorClasses[status] || colorClasses[Status.Unverified];
  
  return (
    <span className={`inline-flex items-center space-x-1 rounded-full font-medium ${s} ${colorClass}`}>
      <Icon className="h-3 w-3" />
      <span>{getStatusLabel(status)}</span>
    </span>
  );
}

/**
 * Stake requirement notice
 */
export function StakeNotice({ minStake, maxStake }) {
  return (
    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
      <div className="flex items-start space-x-2">
        <Coins className="h-5 w-5 text-yellow-500 mt-0.5" />
        <div>
          <div className="font-medium text-yellow-800 dark:text-yellow-200">Stake Required</div>
          <div className="text-sm text-yellow-700 dark:text-yellow-300">
            Deposit {minStake} - {maxStake} ETH as collateral. This is refundable after successful verification.
            Fraudulent data will result in stake being slashed.
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Verification explanation panel
 */
export function VerificationExplainer() {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-blue-500" />
          <span className="font-medium text-blue-800 dark:text-blue-200">
            How Verification Works
          </span>
        </div>
        <span className="text-blue-500">{expanded ? '−' : '+'}</span>
      </button>
      
      {expanded && (
        <div className="mt-3 space-y-3 text-sm text-blue-700 dark:text-blue-300">
          <div className="flex items-start space-x-2">
            <span className="font-bold">1.</span>
            <div>
              <strong>Stake ETH</strong> - Deposit collateral as economic commitment to data authenticity
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold">2.</span>
            <div>
              <strong>Upload Document</strong> - Submit supporting medical documents (lab reports, prescriptions)
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold">3.</span>
            <div>
              <strong>AI Verification</strong> - AI extracts data from documents and compares with your submission
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold">4.</span>
            <div>
              <strong>Build Reputation</strong> - Verified data increases your reputation score over time
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold">5.</span>
            <div>
              <strong>Claim Stake</strong> - After 7-day dispute window, reclaim your stake
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
