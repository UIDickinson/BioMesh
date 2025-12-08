'use client';

import { useState } from 'react';
import { 
  FileText, 
  Shield, 
  DollarSign, 
  AlertTriangle, 
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Info,
  Globe,
  Lock
} from 'lucide-react';

/**
 * Patient Consent Form Component
 * 
 * Collects patient consent for participating in the research data marketplace.
 * All acknowledgments are required before submitting health data.
 */
export default function PatientConsentForm({ onSubmit, isLoading, paymentTerms }) {
  const [expanded, setExpanded] = useState({
    dataUsage: true,
    payment: false,
    preferences: false,
    risks: false
  });
  
  const [formData, setFormData] = useState({
    // Required acknowledgments
    acknowledgesDataUsage: false,
    acknowledgesAnonymization: false,
    acknowledgesPaymentTerms: false,
    acknowledgesRisks: false,
    
    // Query preferences
    acceptsAggregateQueries: true,
    acceptsIndividualQueries: false,
    
    // Optional preferences
    minimumPaymentTier: 0,
    dataRetentionMonths: 0, // 0 = indefinite
    allowsInternationalResearch: true
  });
  
  const [errors, setErrors] = useState({});

  const toggleSection = (section) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCheckboxChange = (field) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
    // Clear error when user interacts
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSelectChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.acknowledgesDataUsage) {
      newErrors.acknowledgesDataUsage = 'Required';
    }
    if (!formData.acknowledgesAnonymization) {
      newErrors.acknowledgesAnonymization = 'Required';
    }
    if (!formData.acknowledgesPaymentTerms) {
      newErrors.acknowledgesPaymentTerms = 'Required';
    }
    if (!formData.acknowledgesRisks) {
      newErrors.acknowledgesRisks = 'Required';
    }
    if (!formData.acceptsAggregateQueries && !formData.acceptsIndividualQueries) {
      newErrors.queryType = 'At least one query type must be accepted';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const Section = ({ id, title, icon: Icon, children }) => (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mb-4">
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <Icon className="h-5 w-5 text-primary-500" />
          <span className="font-medium">{title}</span>
        </div>
        {expanded[id] ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {expanded[id] && (
        <div className="p-4 space-y-4 bg-white dark:bg-gray-900">
          {children}
        </div>
      )}
    </div>
  );

  const Checkbox = ({ field, label, description, required = false }) => (
    <label className="flex items-start space-x-3 cursor-pointer group">
      <div className="flex-shrink-0 mt-1">
        <input
          type="checkbox"
          checked={formData[field]}
          onChange={() => handleCheckboxChange(field)}
          className="h-5 w-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
        />
      </div>
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-500">
            {label}
          </span>
          {required && <span className="text-red-500 text-sm">*</span>}
          {errors[field] && (
            <span className="text-red-500 text-xs">{errors[field]}</span>
          )}
        </div>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>
    </label>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-4">
          <FileText className="h-8 w-8 text-primary-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Patient Consent Form</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please review and acknowledge the following to participate in the BioMesh research data marketplace.
        </p>
      </div>

      {/* Data Usage Section */}
      <Section id="dataUsage" title="Data Usage Agreement" icon={Shield}>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">How Your Data Will Be Used</p>
              <p>Your health data will be encrypted using Fully Homomorphic Encryption (FHE) and made available for research queries. Researchers can compute statistics on encrypted data without ever seeing your raw information.</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <Checkbox
            field="acknowledgesDataUsage"
            label="I understand my data will be used for medical research"
            description="My encrypted health data may be included in aggregate statistics and research queries conducted by verified researchers."
            required
          />
          
          <Checkbox
            field="acknowledgesAnonymization"
            label="I understand my data is encrypted and anonymized"
            description="My data is encrypted using FHE technology. Researchers cannot access my raw data or identify me personally."
            required
          />
        </div>
      </Section>

      {/* Payment Terms Section */}
      <Section id="payment" title="Payment Terms" icon={DollarSign}>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-4">
          <div className="flex items-start space-x-3">
            <DollarSign className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800 dark:text-green-200">
              <p className="font-medium mb-2">Payment Distribution</p>
              <ul className="space-y-1">
                <li>• <strong>{paymentTerms?.patientShare || 70}%</strong> of query fees go to data contributors (patients)</li>
                <li>• <strong>{paymentTerms?.platformShare || 30}%</strong> goes to platform maintenance</li>
                <li>• Base query fee: <strong>{paymentTerms?.baseQueryFee || '0.01'} ETH</strong></li>
                <li>• Individual record query fee: <strong>{paymentTerms?.individualQueryFee || '0.02'} ETH</strong></li>
              </ul>
            </div>
          </div>
        </div>
        
        <Checkbox
          field="acknowledgesPaymentTerms"
          label="I understand and accept the payment terms"
          description="I understand how earnings are calculated and distributed based on the query types my data is used for."
          required
        />

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium mb-2">Minimum Payment Tier Preference</label>
          <select
            value={formData.minimumPaymentTier}
            onChange={(e) => handleSelectChange('minimumPaymentTier', parseInt(e.target.value))}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
          >
            <option value={0}>Any (maximize data usage)</option>
            <option value={1}>Standard tier only</option>
            <option value={2}>Premium tier only</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Higher tiers may result in fewer queries but higher payments per query.</p>
        </div>
      </Section>

      {/* Query Preferences Section */}
      <Section id="preferences" title="Query Preferences" icon={Lock}>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Choose what types of research queries can access your data:
        </p>
        
        <div className="space-y-4">
          <Checkbox
            field="acceptsAggregateQueries"
            label="Allow Aggregate Queries"
            description="Researchers can include my data in aggregate statistics (e.g., average biomarker levels, patient counts). This is the most privacy-preserving option."
          />
          
          <Checkbox
            field="acceptsIndividualQueries"
            label="Allow Individual Record Access"
            description="Researchers can access my individual anonymized record (with k-anonymity protection). This provides higher payments but shares more detail."
          />
          
          {errors.queryType && (
            <p className="text-red-500 text-sm">{errors.queryType}</p>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Data Retention Period</label>
            <select
              value={formData.dataRetentionMonths}
              onChange={(e) => handleSelectChange('dataRetentionMonths', parseInt(e.target.value))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
            >
              <option value={0}>Indefinite (until I revoke)</option>
              <option value={12}>12 months</option>
              <option value={24}>24 months</option>
              <option value={36}>36 months</option>
            </select>
          </div>
          
          <Checkbox
            field="allowsInternationalResearch"
            label="Allow International Research"
            description="Allow researchers from any country to query my data. Unchecking limits to domestic researchers only."
          />
        </div>
      </Section>

      {/* Risks Section */}
      <Section id="risks" title="Risk Acknowledgment" icon={AlertTriangle}>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium mb-2">Important Information</p>
              <ul className="space-y-1">
                <li>• While we use state-of-the-art encryption, no system is 100% secure</li>
                <li>• Blockchain transactions are public and permanent</li>
                <li>• Smart contracts may contain undiscovered vulnerabilities</li>
                <li>• Research findings may be unexpected or concerning</li>
              </ul>
            </div>
          </div>
        </div>
        
        <Checkbox
          field="acknowledgesRisks"
          label="I acknowledge the potential risks"
          description="I understand the inherent risks of participating in a blockchain-based research platform and accept them."
          required
        />
      </Section>

      {/* World ID Optional Notice */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg flex items-start space-x-3">
        <Globe className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-gray-700 dark:text-gray-300">World ID Verification (Optional)</p>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            You can optionally verify your identity with World ID for enhanced trust. This is not required to participate but may provide benefits like higher trust scores.
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-4 px-6 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            <span>Submitting Consent...</span>
          </>
        ) : (
          <>
            <CheckCircle className="h-5 w-5" />
            <span>Submit Patient Consent</span>
          </>
        )}
      </button>

      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        By submitting, you agree to the terms outlined above. Your consent will be recorded on the blockchain.
      </p>
    </form>
  );
}
