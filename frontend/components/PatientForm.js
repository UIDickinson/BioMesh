'use client';

import { useState } from 'react';
import { validateAge, validateDiagnosis, validateOutcome } from '@/lib/utils';
import { Lock, Loader2, Shield, Users } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function PatientForm({ onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    age: '',
    diagnosis: '',
    outcome: '',
    biomarker: '',
    consentLevel: '0' // Default: aggregate only
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.age || !validateAge(formData.age)) {
      newErrors.age = 'Age must be between 1 and 120';
    }
    if (!formData.diagnosis || !validateDiagnosis(formData.diagnosis)) {
      newErrors.diagnosis = 'Enter a valid diagnosis code (0-9999)';
    }
    if (!formData.outcome || !validateOutcome(formData.outcome)) {
      newErrors.outcome = 'Outcome must be between 0 and 100';
    }
    if (!formData.biomarker || isNaN(formData.biomarker)) {
      newErrors.biomarker = 'Enter a valid biomarker value';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validate()) {
      await onSubmit(formData);
      setFormData({ age: '', diagnosis: '', outcome: '', biomarker: '', consentLevel: '0' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Age <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="age"
            value={formData.age}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-primary-500/20 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
            placeholder="Enter age (1-120)"
            disabled={isLoading}
          />
          {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Diagnosis Code <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="diagnosis"
            value={formData.diagnosis}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-primary-500/20 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
            placeholder="e.g., 250 for diabetes"
            disabled={isLoading}
          />
          {errors.diagnosis && <p className="text-red-500 text-sm mt-1">{errors.diagnosis}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Treatment Outcome (0-100) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="outcome"
            value={formData.outcome}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-primary-500/20 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
            placeholder="0 (worst) to 100 (best)"
            disabled={isLoading}
          />
          {errors.outcome && <p className="text-red-500 text-sm mt-1">{errors.outcome}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Biomarker Value <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="biomarker"
            value={formData.biomarker}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-primary-500/20 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
            placeholder="Enter biomarker value"
            disabled={isLoading}
          />
          {errors.biomarker && <p className="text-red-500 text-sm mt-1">{errors.biomarker}</p>}
        </div>
      </div>

      {/* Consent Level Selector */}
      <div className="mt-6">
        <label className="block text-sm font-medium mb-3">
          Data Sharing Consent <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label 
            className={`relative flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
              formData.consentLevel === '0' 
                ? 'border-primary-500 bg-primary-500/10' 
                : 'border-gray-300 dark:border-gray-600 hover:border-primary-300'
            }`}
          >
            <input
              type="radio"
              name="consentLevel"
              value="0"
              checked={formData.consentLevel === '0'}
              onChange={handleChange}
              className="sr-only"
              disabled={isLoading}
            />
            <div className="flex items-start space-x-3">
              <Users className={`h-6 w-6 mt-0.5 ${formData.consentLevel === '0' ? 'text-primary-500' : 'text-gray-400'}`} />
              <div>
                <span className="block font-medium">Aggregate Only</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Your data contributes to statistical summaries only. Individual records are never shared.
                </span>
              </div>
            </div>
          </label>
          
          <label 
            className={`relative flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
              formData.consentLevel === '1' 
                ? 'border-green-500 bg-green-500/10' 
                : 'border-gray-300 dark:border-gray-600 hover:border-green-300'
            }`}
          >
            <input
              type="radio"
              name="consentLevel"
              value="1"
              checked={formData.consentLevel === '1'}
              onChange={handleChange}
              className="sr-only"
              disabled={isLoading}
            />
            <div className="flex items-start space-x-3">
              <Shield className={`h-6 w-6 mt-0.5 ${formData.consentLevel === '1' ? 'text-green-500' : 'text-gray-400'}`} />
              <div>
                <span className="block font-medium">Allow Individual Access</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Anonymized records can be shared with researchers. Earns higher rewards.
                </span>
              </div>
            </div>
          </label>
        </div>
      </div>

      <div className="flex items-center space-x-2 p-4 bg-primary-500/10 rounded-lg border border-primary-500/20">
        <Lock className="h-5 w-5 text-primary-500" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your data will be encrypted client-side using FHE before submission
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Encrypting & Submitting...</span>
          </>
        ) : (
          <span>Submit Encrypted Data</span>
        )}
      </button>
    </form>
  );
}