'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useConsent } from '@/hooks/useConsent';
import Link from 'next/link';
import { FileText, FlaskConical, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

/**
 * ConsentGate Component
 * 
 * Checks if the user has the required consent before allowing access to protected content.
 * Shows a consent requirement message with a link to the consent form if consent is missing.
 * 
 * @param {Object} props
 * @param {string} props.type - 'patient' or 'researcher'
 * @param {React.ReactNode} props.children - Content to show if consent is valid
 * @param {boolean} props.showStatus - Whether to show consent status badge
 */
export default function ConsentGate({ type, children, showStatus = false }) {
  const { signer, address, isConnected } = useWallet();
  const { canSubmitData, canExecuteQueries, getUserStatus, isLoading } = useConsent(signer);
  
  const [hasConsent, setHasConsent] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkConsent = async () => {
      if (!signer || !address) {
        setHasConsent(false);
        setChecking(false);
        return;
      }
      
      try {
        if (type === 'patient') {
          const can = await canSubmitData(address);
          setHasConsent(can);
        } else if (type === 'researcher') {
          const can = await canExecuteQueries(address);
          setHasConsent(can);
        }
      } catch (err) {
        console.error('Error checking consent:', err);
        setHasConsent(false);
      } finally {
        setChecking(false);
      }
    };
    
    checkConsent();
  }, [signer, address, type, canSubmitData, canExecuteQueries]);

  // Not connected
  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Wallet Not Connected</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Please connect your wallet to continue.
        </p>
      </div>
    );
  }

  // Loading
  if (checking || isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  // Has consent - render children
  if (hasConsent) {
    if (showStatus) {
      return (
        <div>
          <div className="mb-4 inline-flex items-center space-x-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>Consent Active</span>
          </div>
          {children}
        </div>
      );
    }
    return children;
  }

  // No consent - show requirement message
  const isPatient = type === 'patient';
  const Icon = isPatient ? FileText : FlaskConical;
  const consentPath = isPatient ? '/patient/consent' : '/researcher/consent';
  const roleLabel = isPatient ? 'Patient' : 'Researcher';

  return (
    <div className="max-w-lg mx-auto py-12 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-6">
          <Icon className="h-8 w-8 text-primary-500" />
        </div>
        
        <h2 className="text-2xl font-bold mb-4">{roleLabel} Consent Required</h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {isPatient 
            ? 'You need to complete the patient consent form before submitting health data. This ensures you understand how your data will be used and protects your rights.'
            : 'You need to complete the researcher consent form before executing queries. This ensures you agree to ethical data usage and privacy requirements.'
          }
        </p>

        <div className="space-y-4">
          <Link
            href={consentPath}
            className="w-full flex items-center justify-center space-x-2 py-3 px-6 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors"
          >
            <span>Complete Consent Form</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
          
          <Link
            href={isPatient ? '/patient' : '/researcher'}
            className="block text-sm text-gray-500 hover:text-primary-500"
          >
            Go back to dashboard
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-medium mb-3 text-left">What you&apos;ll agree to:</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 text-left space-y-2">
            {isPatient ? (
              <>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Your data will be encrypted using FHE technology</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Researchers can only access aggregate statistics</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>You&apos;ll earn payments when your data is used</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>You can revoke consent at any time</span>
                </li>
              </>
            ) : (
              <>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Use data ethically for legitimate research</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Not attempt to re-identify patients</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Pay query fees that support data contributors</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Cite BioMesh in publications</span>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * ConsentStatus Badge Component
 * Shows the current consent status in a compact badge format
 */
export function ConsentStatusBadge({ type }) {
  const { signer, address, isConnected } = useWallet();
  const { canSubmitData, canExecuteQueries } = useConsent(signer);
  const [hasConsent, setHasConsent] = useState(null);

  useEffect(() => {
    const check = async () => {
      if (!signer || !address) {
        setHasConsent(false);
        return;
      }
      
      try {
        if (type === 'patient') {
          const can = await canSubmitData(address);
          setHasConsent(can);
        } else {
          const can = await canExecuteQueries(address);
          setHasConsent(can);
        }
      } catch {
        setHasConsent(false);
      }
    };
    
    check();
  }, [signer, address, type, canSubmitData, canExecuteQueries]);

  if (!isConnected || hasConsent === null) return null;

  const isPatient = type === 'patient';
  const consentPath = isPatient ? '/patient/consent' : '/researcher/consent';

  if (hasConsent) {
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
        <CheckCircle className="h-3 w-3" />
        <span>Consent Active</span>
      </span>
    );
  }

  return (
    <Link 
      href={consentPath}
      className="inline-flex items-center space-x-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded text-xs hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
    >
      <AlertTriangle className="h-3 w-3" />
      <span>Consent Required</span>
    </Link>
  );
}
