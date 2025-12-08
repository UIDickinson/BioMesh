'use client';

import { useState } from 'react';
import { 
  FlaskConical, 
  Shield, 
  DollarSign, 
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Info,
  Globe,
  BookOpen,
  Scale,
  FileWarning
} from 'lucide-react';

/**
 * Researcher Consent Form Component
 * 
 * Collects researcher consent for accessing the research data marketplace.
 * All acknowledgments are required before executing queries.
 */
export default function ResearcherConsentForm({ onSubmit, isLoading, paymentTerms }) {
  const [expanded, setExpanded] = useState({
    privacy: true,
    ethics: false,
    agreements: false
  });
  
  const [formData, setFormData] = useState({
    // Required acknowledgments
    acknowledgesDataPrivacy: false,
    acknowledgesEthicalUse: false,
    acknowledgesPaymentTerms: false,
    acknowledgesDataLimitations: false,
    acknowledgesSecurityObligations: false,
    
    // Required agreements
    agreesToNotRedistribute: false,
    agreesToCiteDataSource: false,
    agreesToReportFindings: false
  });
  
  const [errors, setErrors] = useState({});

  const toggleSection = (section) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCheckboxChange = (field) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required acknowledgments
    if (!formData.acknowledgesDataPrivacy) {
      newErrors.acknowledgesDataPrivacy = 'Required';
    }
    if (!formData.acknowledgesEthicalUse) {
      newErrors.acknowledgesEthicalUse = 'Required';
    }
    if (!formData.acknowledgesPaymentTerms) {
      newErrors.acknowledgesPaymentTerms = 'Required';
    }
    if (!formData.acknowledgesDataLimitations) {
      newErrors.acknowledgesDataLimitations = 'Required';
    }
    if (!formData.acknowledgesSecurityObligations) {
      newErrors.acknowledgesSecurityObligations = 'Required';
    }
    
    // Required agreements
    if (!formData.agreesToNotRedistribute) {
      newErrors.agreesToNotRedistribute = 'Required';
    }
    if (!formData.agreesToCiteDataSource) {
      newErrors.agreesToCiteDataSource = 'Required';
    }
    if (!formData.agreesToReportFindings) {
      newErrors.agreesToReportFindings = 'Required';
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

  const TextInput = ({ field, label, placeholder, required = false, multiline = false }) => (
    <div>
      <label className="block text-sm font-medium mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {multiline ? (
        <textarea
          value={formData[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
        />
      ) : (
        <input
          type="text"
          value={formData[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500"
        />
      )}
      {errors[field] && (
        <p className="text-red-500 text-sm mt-1">{errors[field]}</p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-4">
          <FlaskConical className="h-8 w-8 text-primary-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Researcher Consent Form</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please review and acknowledge the following to access the BioMesh research data marketplace.
        </p>
      </div>

      {/* Data Privacy Section */}
      <Section id="privacy" title="Data Privacy & Security" icon={Shield}>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Privacy-Preserving Research</p>
              <p>BioMesh uses Fully Homomorphic Encryption (FHE) to enable computations on encrypted data. You will receive query results without ever accessing raw patient data.</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <Checkbox
            field="acknowledgesDataPrivacy"
            label="I will not attempt to re-identify patients"
            description="I understand that patient data is anonymized and encrypted. I will not use any methods to attempt to identify individual patients."
            required
          />
          
          <Checkbox
            field="acknowledgesSecurityObligations"
            label="I will maintain data security"
            description="I agree to implement appropriate security measures for any query results I receive and will not store them on unsecured systems."
            required
          />
          
          <Checkbox
            field="acknowledgesDataLimitations"
            label="I understand data limitations"
            description="I understand that data is self-reported, may contain inaccuracies, and is subject to FHE computational constraints."
            required
          />
        </div>
      </Section>

      {/* Ethical Use Section */}
      <Section id="ethics" title="Ethical Use Agreement" icon={Scale}>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg mb-4">
          <div className="flex items-start space-x-3">
            <BookOpen className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-purple-800 dark:text-purple-200">
              <p className="font-medium mb-2">Research Ethics Standards</p>
              <ul className="space-y-1">
                <li>• Use data only for legitimate medical research</li>
                <li>• Follow established ethical guidelines</li>
                <li>• Report findings responsibly</li>
                <li>• Respect patient privacy at all times</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <Checkbox
            field="acknowledgesEthicalUse"
            label="I will use data ethically for research only"
            description="I agree to use any data or query results solely for legitimate medical research purposes and will follow established ethical guidelines."
            required
          />
          
          <Checkbox
            field="acknowledgesPaymentTerms"
            label="I understand and accept the payment terms"
            description={`Query fees: ${paymentTerms?.baseQueryFee || '0.01'} ETH (aggregate) / ${paymentTerms?.individualQueryFee || '0.02'} ETH (individual). ${paymentTerms?.patientShare || 70}% goes to data contributors.`}
            required
          />
        </div>
      </Section>

      {/* Agreements Section */}
      <Section id="agreements" title="Usage Agreements" icon={FileWarning}>
        <div className="space-y-4">
          <Checkbox
            field="agreesToNotRedistribute"
            label="I will not redistribute data or results"
            description="I agree not to share, sell, or redistribute any data, query results, or derived datasets outside my research team."
            required
          />
          
          <Checkbox
            field="agreesToCiteDataSource"
            label="I will cite BioMesh in publications"
            description="I agree to appropriately cite BioMesh as the data source in any publications, presentations, or reports that use query results."
            required
          />
          
          <Checkbox
            field="agreesToReportFindings"
            label="I will report adverse findings"
            description="If my research uncovers any safety concerns, security issues, or potential data breaches, I will promptly report them to the platform."
            required
          />
        </div>
      </Section>

      {/* World ID Optional Notice */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg flex items-start space-x-3">
        <Globe className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-gray-700 dark:text-gray-300">World ID Verification (Optional)</p>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            You can optionally verify your identity with World ID for enhanced trust. This is not required but may provide access to additional features.
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
            <span>Submit Researcher Consent</span>
          </>
        )}
      </button>

      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        By submitting, you agree to the terms outlined above. Your consent will be recorded on the blockchain.
      </p>
    </form>
  );
}
