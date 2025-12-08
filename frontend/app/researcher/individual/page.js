'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { useResearchOracle } from '@/hooks/useResearchOracle';
import { useConsent } from '@/hooks/useConsent';
import { useUserDecryption } from '@/hooks/useUserDecryption';
import ConsentGate from '@/components/ConsentGate';
import { 
  ArrowLeft, 
  Search, 
  User, 
  FileText, 
  AlertCircle, 
  CheckCircle,
  Filter,
  Database,
  Lock,
  Unlock,
  Eye,
  DollarSign,
  Info,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Key
} from 'lucide-react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

/**
 * Individual Record Access Page
 * 
 * Allows researchers to query individual patient records (anonymized)
 * for patients who have given individual access consent.
 * 
 * This requires:
 * 1. Researcher consent form completion
 * 2. Payment for individual record queries
 * 3. Patient consent for individual access (ConsentLevel.IndividualAllowed)
 */
export default function IndividualAccessPage() {
  const router = useRouter();
  const { signer, address, isConnected } = useWallet();
  const { 
    queryIndividualRecords, 
    getIndividualQueryFee,
    getIndividualQueryResults,
    fetchEncryptedRecords,
    isLoading: oracleLoading 
  } = useResearchOracle(signer);
  const { getResearcherConsent } = useConsent(signer);
  const { decryptHealthRecords, isDecrypting } = useUserDecryption(signer);
  
  const [queryFee, setQueryFee] = useState('0.02');
  const [hasResearcherConsent, setHasResearcherConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [queryResults, setQueryResults] = useState(null);
  const [decryptedRecords, setDecryptedRecords] = useState(null);
  const [decryptionState, setDecryptionState] = useState('idle'); // idle, fetching, decrypting, complete, error
  const [error, setError] = useState(null);
  const [expandedRecord, setExpandedRecord] = useState(null);
  
  // Query parameters
  const [queryParams, setQueryParams] = useState({
    diagnosisCode: '',
    minAge: '18',
    maxAge: '65',
    maxResults: '10',
    gender: '', // empty = any
    ethnicity: '', // empty = any
    minOutcome: '0',
    maxOutcome: '100'
  });

  // Diagnosis code options (ICD-10 categories)
  const diagnosisCodes = [
    { value: '1', label: 'A00-B99: Infectious diseases' },
    { value: '2', label: 'C00-D49: Neoplasms (Cancer)' },
    { value: '3', label: 'D50-D89: Blood diseases' },
    { value: '4', label: 'E00-E89: Endocrine/metabolic' },
    { value: '5', label: 'F01-F99: Mental disorders' },
    { value: '6', label: 'G00-G99: Nervous system' },
    { value: '7', label: 'I00-I99: Circulatory system' },
    { value: '8', label: 'J00-J99: Respiratory system' },
    { value: '9', label: 'K00-K95: Digestive system' },
    { value: '10', label: 'M00-M99: Musculoskeletal' }
  ];

  const genderOptions = [
    { value: '', label: 'Any Gender' },
    { value: '0', label: 'Male' },
    { value: '1', label: 'Female' },
    { value: '2', label: 'Other' }
  ];

  const ethnicityOptions = [
    { value: '', label: 'Any Ethnicity' },
    { value: '1', label: 'American Indian/Alaska Native' },
    { value: '2', label: 'Asian' },
    { value: '3', label: 'Black/African American' },
    { value: '4', label: 'Hispanic/Latino' },
    { value: '5', label: 'Pacific Islander' },
    { value: '6', label: 'White' },
    { value: '7', label: 'Multiracial' }
  ];

  useEffect(() => {
    const loadData = async () => {
      if (!signer || !address) {
        setLoading(false);
        return;
      }

      try {
        // Check researcher consent
        const consent = await getResearcherConsent(address);
        setHasResearcherConsent(consent && consent.status === 1); // Active

        // Load query fee
        const fee = await getIndividualQueryFee();
        setQueryFee(fee);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [signer, address, getResearcherConsent, getIndividualQueryFee]);

  const handleInputChange = (field, value) => {
    setQueryParams(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateQuery = () => {
    if (!queryParams.diagnosisCode) {
      setError('Please select a diagnosis category');
      return false;
    }
    
    const minAge = parseInt(queryParams.minAge);
    const maxAge = parseInt(queryParams.maxAge);
    
    if (isNaN(minAge) || minAge < 0 || minAge > 120) {
      setError('Minimum age must be between 0 and 120');
      return false;
    }
    
    if (isNaN(maxAge) || maxAge < 0 || maxAge > 120) {
      setError('Maximum age must be between 0 and 120');
      return false;
    }
    
    if (minAge > maxAge) {
      setError('Minimum age cannot be greater than maximum age');
      return false;
    }

    const maxResults = parseInt(queryParams.maxResults);
    if (isNaN(maxResults) || maxResults < 1 || maxResults > 100) {
      setError('Max results must be between 1 and 100');
      return false;
    }
    
    return true;
  };

  const handleSubmitQuery = async () => {
    if (!validateQuery()) return;
    
    setError(null);
    setQueryResults(null);
    setDecryptedRecords(null);
    setDecryptionState('idle');

    try {
      const result = await queryIndividualRecords(
        parseInt(queryParams.diagnosisCode),
        parseInt(queryParams.minAge),
        parseInt(queryParams.maxAge),
        parseInt(queryParams.maxResults)
      );

      if (result.success) {
        setQueryResults(result);
        
        // If we got a query ID, fetch the record IDs and decrypt
        if (result.queryId) {
          await fetchAndDecryptRecords(result.queryId);
        }
      } else {
        setError(result.error || 'Query failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to execute query');
    }
  };

  // Fetch encrypted record data and decrypt all 9 fields
  const fetchAndDecryptRecords = async (queryId) => {
    try {
      setDecryptionState('fetching');
      
      // Get the record IDs from the query result
      const queryResult = await getIndividualQueryResults(queryId);
      
      if (!queryResult || !queryResult.kAnonymityMet) {
        console.log('K-anonymity not met or no results:', queryResult);
        setDecryptionState('complete');
        setDecryptedRecords([]);
        return;
      }

      const recordIds = queryResult.recordIds || [];
      console.log(`📋 Found ${recordIds.length} record IDs to decrypt`);
      
      if (recordIds.length === 0) {
        setDecryptionState('complete');
        setDecryptedRecords([]);
        return;
      }

      // Fetch encrypted handles from DataRegistry
      console.log('📥 Fetching encrypted records from DataRegistry...');
      const encryptedRecords = await fetchEncryptedRecords(recordIds);
      
      if (encryptedRecords.length === 0) {
        setDecryptionState('complete');
        setDecryptedRecords([]);
        return;
      }

      // Decrypt all records
      setDecryptionState('decrypting');
      console.log(`🔓 Decrypting ${encryptedRecords.length} records...`);
      
      const decrypted = await decryptHealthRecords(encryptedRecords);
      
      // Merge recordId info with decrypted data
      const finalRecords = decrypted.map((record, idx) => ({
        ...record,
        recordId: encryptedRecords[idx]?.recordId,
        timestamp: encryptedRecords[idx]?.timestamp,
        id: idx + 1, // Display ID
      }));

      console.log('✅ Decryption complete:', finalRecords);
      setDecryptedRecords(finalRecords);
      setDecryptionState('complete');

    } catch (err) {
      console.error('❌ Fetch/decrypt error:', err);
      setDecryptionState('error');
      setError(`Decryption failed: ${err.message}`);
    }
  };

  const toggleRecordExpand = (recordId) => {
    setExpandedRecord(expandedRecord === recordId ? null : recordId);
  };

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="h-20 w-20 text-yellow-500 mx-auto mb-6" />
        <h1 className="text-4xl font-bold mb-4">Connect Wallet</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Please connect your wallet to access individual records
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <LoadingSpinner size="lg" />
        <p className="text-gray-500 mt-4">Loading...</p>
      </div>
    );
  }

  return (
    <ConsentGate type="researcher">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <Link
          href="/researcher"
          className="inline-flex items-center space-x-2 text-primary-500 hover:text-primary-600 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-4xl font-bold">Individual Record Access</h1>
            <span className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
              Premium
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Query anonymized individual patient records from consenting participants
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-8 p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-1">
                About Individual Record Access
              </h3>
              <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                <li>• Only records from patients who explicitly consented to individual access are included</li>
                <li>• All records are anonymized - no personally identifiable information is shared</li>
                <li>• Records meet k-anonymity thresholds to prevent re-identification</li>
                <li>• Fee per query: <strong>{queryFee} ETH</strong></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Query Builder Panel */}
          <div className="lg:col-span-1">
            <div className="glass-morphism rounded-xl p-6 border border-primary-500/20 sticky top-6">
              <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                <Filter className="h-5 w-5 text-primary-500" />
                <span>Query Parameters</span>
              </h2>

              <div className="space-y-4">
                {/* Diagnosis Code - Required */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Diagnosis Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={queryParams.diagnosisCode}
                    onChange={(e) => handleInputChange('diagnosisCode', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select diagnosis...</option>
                    {diagnosisCodes.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>

                {/* Age Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Min Age</label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={queryParams.minAge}
                      onChange={(e) => handleInputChange('minAge', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Age</label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={queryParams.maxAge}
                      onChange={(e) => handleInputChange('maxAge', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Gender Filter */}
                <div>
                  <label className="block text-sm font-medium mb-1">Gender</label>
                  <select
                    value={queryParams.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
                  >
                    {genderOptions.map(g => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>

                {/* Ethnicity Filter */}
                <div>
                  <label className="block text-sm font-medium mb-1">Ethnicity</label>
                  <select
                    value={queryParams.ethnicity}
                    onChange={(e) => handleInputChange('ethnicity', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
                  >
                    {ethnicityOptions.map(e => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                </div>

                {/* Outcome Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Min Outcome</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={queryParams.minOutcome}
                      onChange={(e) => handleInputChange('minOutcome', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Outcome</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={queryParams.maxOutcome}
                      onChange={(e) => handleInputChange('maxOutcome', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
                      placeholder="100"
                    />
                  </div>
                </div>

                {/* Max Results */}
                <div>
                  <label className="block text-sm font-medium mb-1">Max Results</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={queryParams.maxResults}
                    onChange={(e) => handleInputChange('maxResults', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum 100 records per query</p>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Query Fee Display */}
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Query Fee:</span>
                    <span className="font-bold text-primary-500">{queryFee} ETH</span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmitQuery}
                  disabled={oracleLoading || !queryParams.diagnosisCode}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {oracleLoading ? (
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
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            {!queryResults && !oracleLoading && (
              <div className="glass-morphism rounded-xl p-12 border border-primary-500/20 text-center">
                <Database className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-500 dark:text-gray-400 mb-2">
                  No Query Results
                </h3>
                <p className="text-gray-400 dark:text-gray-500">
                  Configure your query parameters and click "Execute Query" to search individual records
                </p>
              </div>
            )}

            {(oracleLoading || decryptionState === 'fetching' || decryptionState === 'decrypting') && (
              <div className="glass-morphism rounded-xl p-12 border border-primary-500/20 text-center">
                <LoadingSpinner size="lg" />
                <p className="text-gray-500 mt-4">
                  {oracleLoading && 'Executing encrypted query...'}
                  {decryptionState === 'fetching' && 'Fetching encrypted records...'}
                  {decryptionState === 'decrypting' && (
                    <span className="flex items-center justify-center gap-2">
                      <Key className="h-4 w-4 animate-pulse" />
                      Decrypting 9 health data fields...
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {decryptionState === 'decrypting' 
                    ? 'Using FHE User Decryption (this may take 5-10 seconds)'
                    : 'Data is processed homomorphically for privacy'}
                </p>
              </div>
            )}

            {queryResults && queryResults.success && decryptionState === 'complete' && (
              <div className="space-y-6">
                {/* Results Summary */}
                <div className="glass-morphism rounded-xl p-6 border border-green-500/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-6 w-6 text-green-500" />
                      <h3 className="text-lg font-semibold">Query & Decryption Successful</h3>
                    </div>
                    <span className="text-sm text-gray-500">
                      {decryptedRecords?.length || 0} records decrypted
                    </span>
                  </div>
                  
                  {queryResults.queryId && (
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        Query ID: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{queryResults.queryId}</code>
                      </span>
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Unlock className="h-4 w-4" />
                        All 9 fields decrypted
                      </span>
                    </div>
                  )}
                </div>

                {/* Decrypted Individual Records */}
                {decryptedRecords && decryptedRecords.length > 0 ? (
                  <div className="space-y-4">
                    {decryptedRecords.map((record, index) => (
                      <div 
                        key={record.recordId || index}
                        className="glass-morphism rounded-xl border border-primary-500/20 overflow-hidden"
                      >
                        {/* Record Header */}
                        <button
                          onClick={() => toggleRecordExpand(record.recordId || index)}
                          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="p-2 rounded-lg bg-primary-500/10">
                              <User className="h-5 w-5 text-primary-500" />
                            </div>
                            <div className="text-left">
                              <p className="font-semibold">
                                Record #{record.id || index + 1}
                              </p>
                              <p className="text-sm text-gray-500">
                                {diagnosisCodes.find(d => d.value === String(record.diagnosis))?.label || `Diagnosis Code: ${record.diagnosis ?? 'N/A'}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="text-sm font-medium">Age: {record.age ?? 'N/A'}</p>
                              <p className="text-xs text-gray-500">
                                Outcome: {record.treatmentOutcome ?? 'N/A'}%
                              </p>
                            </div>
                            {expandedRecord === (record.recordId || index) ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </button>

                        {/* Expanded Details - All 9 Fields */}
                        {expandedRecord === (record.recordId || index) && (
                          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <DataField label="Age" value={record.age} />
                              <DataField 
                                label="Gender" 
                                value={record.gender !== null ? genderOptions.find(g => g.value === String(record.gender))?.label : null} 
                              />
                              <DataField 
                                label="Ethnicity" 
                                value={record.ethnicity !== null ? ethnicityOptions.find(e => e.value === String(record.ethnicity))?.label : null} 
                              />
                              <DataField 
                                label="Diagnosis" 
                                value={record.diagnosis !== null 
                                  ? diagnosisCodes.find(d => d.value === String(record.diagnosis))?.label?.split(':')[1]?.trim() || `Code: ${record.diagnosis}`
                                  : null} 
                              />
                              <DataField label="Treatment Outcome" value={record.treatmentOutcome !== null ? `${record.treatmentOutcome}%` : null} />
                              <DataField label="Biomarker" value={record.biomarker !== null ? record.biomarker.toString() : null} />
                              <DataField label="BMI" value={record.bmi !== null ? (record.bmi / 10).toFixed(1) : null} />
                              <DataField label="Systolic BP" value={record.systolicBP !== null ? `${record.systolicBP} mmHg` : null} />
                              <DataField label="Diastolic BP" value={record.diastolicBP !== null ? `${record.diastolicBP} mmHg` : null} />
                            </div>
                            
                            {/* Decryption & Consent Info */}
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <Unlock className="h-4 w-4 text-green-500" />
                                <span>Patient has consented to individual record access</span>
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-primary-500">
                                <Key className="h-4 w-4" />
                                <span>Decrypted via FHE User Decryption</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="glass-morphism rounded-xl p-8 border border-yellow-500/20 text-center">
                    <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
                    <h4 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
                      No Matching Records
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No records match your query criteria, or no patients have consented to individual record access for this data.
                    </p>
                  </div>
                )}
              </div>
            )}

            {queryResults && !queryResults.success && (
              <div className="glass-morphism rounded-xl p-8 border border-red-500/20 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2">
                  Query Failed
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {queryResults.error || 'An error occurred while executing the query'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <Lock className="h-8 w-8 text-primary-500 mb-3" />
            <h3 className="font-semibold mb-2">Privacy Protected</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              All queries are executed on encrypted data using FHE. Patient identities are never revealed.
            </p>
          </div>
          
          <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <FileText className="h-8 w-8 text-primary-500 mb-3" />
            <h3 className="font-semibold mb-2">Consent Required</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Only records from patients who explicitly opted-in to individual access are included.
            </p>
          </div>
          
          <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <DollarSign className="h-8 w-8 text-primary-500 mb-3" />
            <h3 className="font-semibold mb-2">Fair Compensation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Query fees are distributed to patients whose data matches your search criteria.
            </p>
          </div>
        </div>
      </div>
    </ConsentGate>
  );
}

/**
 * Data Field Component
 */
function DataField({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="font-medium">{value || 'N/A'}</p>
    </div>
  );
}
