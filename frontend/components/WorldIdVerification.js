'use client';

import { useState, useEffect } from 'react';
import { 
  Globe, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  QrCode,
  Smartphone,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Info,
  AlertTriangle
} from 'lucide-react';
import { useWorldId, WORLD_ID_CONFIG } from '@/hooks/useWorldId';
import { useWallet } from '@/hooks/useWallet';

/**
 * World ID Verification Component
 * 
 * Provides a user-friendly interface for World ID verification.
 * World ID is OPTIONAL but provides enhanced trust level.
 * 
 * In production, this integrates with the IDKit widget.
 * For development/testnet, it provides a simulated flow.
 */
export default function WorldIdVerification({ 
  onVerified, 
  compact = false,
  showSkip = true 
}) {
  const { signer, address, isConnected } = useWallet();
  const { 
    isLoading, 
    error, 
    verificationStatus, 
    checkVerificationStatus,
    openWorldIdWidget 
  } = useWorldId(signer);
  
  const [step, setStep] = useState('intro'); // intro, scanning, verifying, complete, error
  const [localLoading, setLocalLoading] = useState(false);

  // Check verification status on mount
  useEffect(() => {
    if (isConnected && address) {
      checkVerificationStatus(address);
    }
  }, [isConnected, address, checkVerificationStatus]);

  // Update step based on verification status
  useEffect(() => {
    if (verificationStatus.isVerified) {
      setStep('complete');
    }
  }, [verificationStatus]);

  const handleStartVerification = async () => {
    setStep('scanning');
    setLocalLoading(true);
    
    // Simulate QR scan delay for better UX (in production, this would be actual IDKit)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setStep('verifying');
    
    const result = await openWorldIdWidget();
    
    if (result.success) {
      setStep('complete');
      if (onVerified) {
        onVerified(result);
      }
    } else {
      setStep('error');
    }
    
    setLocalLoading(false);
  };

  const handleSkip = () => {
    if (onVerified) {
      onVerified({ skipped: true, message: 'World ID verification skipped' });
    }
  };

  // Compact badge view for dashboards
  if (compact) {
    return (
      <div className="inline-flex items-center space-x-2">
        {verificationStatus.isVerified ? (
          <>
            <ShieldCheck className="h-5 w-5 text-green-500" />
            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
              World ID Verified
            </span>
          </>
        ) : (
          <button
            onClick={handleStartVerification}
            disabled={isLoading || localLoading}
            className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500/20 transition-colors text-sm"
          >
            <Globe className="h-4 w-4" />
            <span>Verify with World ID</span>
          </button>
        )}
      </div>
    );
  }

  // Already verified
  if (verificationStatus.isVerified && step === 'complete') {
    return (
      <div className="p-6 rounded-xl border border-green-500/30 bg-green-500/10">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-full bg-green-500/20">
            <ShieldCheck className="h-8 w-8 text-green-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-1">
              World ID Verified
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Your identity has been verified with World ID. You have enhanced trust status on the platform.
            </p>
            {verificationStatus.verificationTime && (
              <p className="text-xs text-gray-500">
                Verified on {new Date(verificationStatus.verificationTime * 1000).toLocaleString()}
              </p>
            )}
          </div>
          <CheckCircle className="h-6 w-6 text-green-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl border border-primary-500/30 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-start space-x-4 mb-6">
        <div className="p-3 rounded-full bg-primary-500/20">
          <Globe className="h-8 w-8 text-primary-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-lg font-semibold">World ID Verification</h3>
            <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
              Optional
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Verify your unique humanness with zero-knowledge proofs
          </p>
        </div>
      </div>

      {/* Step Content */}
      {step === 'intro' && (
        <div className="space-y-4">
          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <Shield className="h-5 w-5 text-primary-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Enhanced Trust</p>
                <p className="text-xs text-gray-500">Higher trust score for your contributions</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <Smartphone className="h-5 w-5 text-primary-500 mt-0.5" />
              <div>
                <p className="font-medium text-sm">One-Time Setup</p>
                <p className="text-xs text-gray-500">Verify once, valid across sessions</p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="flex items-start space-x-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">What is World ID?</p>
              <p className="text-xs">
                World ID provides Sybil-resistant identity verification using zero-knowledge proofs. 
                It confirms you're a unique human without revealing any personal information.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleStartVerification}
              disabled={isLoading || localLoading}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {(isLoading || localLoading) ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <QrCode className="h-5 w-5" />
              )}
              <span>Start Verification</span>
            </button>
            
            {showSkip && (
              <button
                onClick={handleSkip}
                className="px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Skip for Now
              </button>
            )}
          </div>

          {/* External Link */}
          <a
            href="https://worldcoin.org/world-id"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 text-sm text-primary-500 hover:text-primary-600"
          >
            <span>Learn more about World ID</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {step === 'scanning' && (
        <div className="text-center py-8">
          <div className="relative inline-block mb-6">
            {/* Animated QR placeholder */}
            <div className="w-48 h-48 mx-auto rounded-xl border-2 border-dashed border-primary-500/50 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
              <QrCode className="h-24 w-24 text-primary-500 animate-pulse" />
            </div>
            {/* Scanning animation */}
            <div className="absolute inset-0 overflow-hidden rounded-xl">
              <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent animate-scan" />
            </div>
          </div>
          <h4 className="text-lg font-semibold mb-2">Scan with World App</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Open the World App on your phone and scan this QR code
          </p>
          <p className="text-xs text-gray-500 mt-4">
            (Simulated for testnet - connecting automatically...)
          </p>
        </div>
      )}

      {step === 'verifying' && (
        <div className="text-center py-8">
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 mx-auto rounded-full border-4 border-primary-500/30 flex items-center justify-center">
              <Loader2 className="h-10 w-10 text-primary-500 animate-spin" />
            </div>
          </div>
          <h4 className="text-lg font-semibold mb-2">Verifying Identity</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Processing zero-knowledge proof...
          </p>
          <div className="flex items-center justify-center space-x-2 mt-4 text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            <span>Submitting to blockchain</span>
          </div>
        </div>
      )}

      {step === 'error' && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>
          <h4 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
            Verification Failed
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {error || 'Unable to complete World ID verification'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setStep('intro')}
              className="px-4 py-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
            >
              Try Again
            </button>
            {showSkip && (
              <button
                onClick={handleSkip}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Continue Without Verification
              </button>
            )}
          </div>
        </div>
      )}

      {/* Testnet Notice */}
      <div className="mt-4 flex items-start space-x-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-700 dark:text-yellow-300">
          <strong>Testnet Mode:</strong> World ID verification is simulated for development. 
          In production, this will use the actual World ID protocol with the World App.
        </p>
      </div>
    </div>
  );
}

/**
 * World ID Status Badge
 * Compact indicator showing verification status
 */
export function WorldIdBadge({ isVerified, verificationTime, size = 'sm' }) {
  const sizes = {
    sm: { icon: 'h-4 w-4', text: 'text-xs', padding: 'px-2 py-1' },
    md: { icon: 'h-5 w-5', text: 'text-sm', padding: 'px-3 py-1.5' },
    lg: { icon: 'h-6 w-6', text: 'text-base', padding: 'px-4 py-2' }
  };
  
  const s = sizes[size] || sizes.sm;
  
  if (isVerified) {
    return (
      <div 
        className={`inline-flex items-center space-x-1.5 ${s.padding} rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300`}
        title={verificationTime ? `Verified on ${new Date(verificationTime * 1000).toLocaleString()}` : 'World ID Verified'}
      >
        <ShieldCheck className={s.icon} />
        <span className={`font-medium ${s.text}`}>Verified</span>
      </div>
    );
  }
  
  return (
    <div className={`inline-flex items-center space-x-1.5 ${s.padding} rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400`}>
      <Globe className={s.icon} />
      <span className={`${s.text}`}>Not Verified</span>
    </div>
  );
}

/**
 * Trust Level Indicator
 * Shows enhanced trust level when World ID + Consent are both complete
 */
export function TrustLevelIndicator({ hasWorldId, hasConsent }) {
  const trustLevel = hasWorldId && hasConsent ? 'enhanced' : hasConsent ? 'basic' : 'none';
  
  const levels = {
    enhanced: {
      label: 'Enhanced Trust',
      description: 'World ID verified + Consent given',
      color: 'emerald',
      icon: ShieldCheck
    },
    basic: {
      label: 'Basic Trust',
      description: 'Consent given',
      color: 'blue',
      icon: Shield
    },
    none: {
      label: 'No Trust Level',
      description: 'Complete consent to participate',
      color: 'gray',
      icon: ShieldAlert
    }
  };
  
  const level = levels[trustLevel];
  const Icon = level.icon;
  
  const colorClasses = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    gray: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
  };
  
  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg border ${colorClasses[level.color]}`}>
      <Icon className="h-5 w-5" />
      <div>
        <p className="font-medium text-sm">{level.label}</p>
        <p className="text-xs opacity-80">{level.description}</p>
      </div>
    </div>
  );
}
