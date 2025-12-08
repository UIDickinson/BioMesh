'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { 
  validateHealthData,
  getAgeError, 
  getDiagnosisError, 
  getBiomarkerError,
  getHeightError,
  getWeightError,
  getHeartRateError,
  getOutcomeError,
  getDiagnosisCategory,
  getAgeGroup,
  getOutcomeLevel,
  getBMIClassification,
  getBloodPressureClassification,
  calculateBMI,
  DIAGNOSIS_CATEGORIES,
  BIOMARKER_REFERENCES,
  GENDER_OPTIONS,
  ETHNICITY_OPTIONS,
  BLOOD_TYPE_OPTIONS,
  SMOKING_STATUS_OPTIONS,
  ALCOHOL_USE_OPTIONS,
  EXERCISE_FREQUENCY_OPTIONS,
  REQUIRED_FIELDS,
  getDefaultFormState
} from '@/lib/utils';
import { 
  Lock, Loader2, AlertCircle, CheckCircle, HelpCircle,
  Upload, FileText, Coins, X, ChevronDown, ChevronUp,
  User, Heart, Activity, Droplet, Info
} from 'lucide-react';
import { useVerification, EvidenceType } from '@/hooks/useVerification';

/**
 * Comprehensive Patient Data Form
 * Required fields: Age, Gender, Blood Type, Diagnosis, Biomarker
 * Optional fields: Height/Weight/BMI, Vitals, Lifestyle factors
 */
export default function PatientForm({ onSubmit, isLoading, signer }) {
  // Form state
  const [formData, setFormData] = useState(getDefaultFormState());
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showOptional, setShowOptional] = useState(false);
  const [showDiagnosisHelper, setShowDiagnosisHelper] = useState(false);
  const [showBiomarkerHelper, setShowBiomarkerHelper] = useState(false);
  
  // Verification state
  const [verificationEnabled, setVerificationEnabled] = useState(false);
  const [stakeAmount, setStakeAmount] = useState('0.01');
  const [document, setDocument] = useState(null);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [evidenceType, setEvidenceType] = useState(EvidenceType.LabReport);
  const [verificationResult, setVerificationResult] = useState(null);
  const [showVerificationDetails, setShowVerificationDetails] = useState(false);
  
  // Auto-fill state
  const [extractedData, setExtractedData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  
  const fileInputRef = useRef(null);
  const verification = useVerification(signer);

  // Calculated values
  const bmi = useMemo(() => {
    if (formData.height && formData.weight) {
      return calculateBMI(parseFloat(formData.weight), parseFloat(formData.height));
    }
    return null;
  }, [formData.height, formData.weight]);

  const bmiClass = useMemo(() => getBMIClassification(bmi), [bmi]);
  const bpClass = useMemo(() => 
    getBloodPressureClassification(formData.systolicBP, formData.diastolicBP), 
    [formData.systolicBP, formData.diastolicBP]
  );

  // Handlers
  const handleChange = useCallback((e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  }, [errors]);

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate on blur
    const validationFns = {
      age: getAgeError,
      diagnosis: getDiagnosisError,
      biomarker: getBiomarkerError,
      height: getHeightError,
      weight: getWeightError,
      heartRate: getHeartRateError,
      outcome: getOutcomeError
    };
    
    if (validationFns[name]) {
      const error = validationFns[name](value);
      if (error) {
        setErrors(prev => ({ ...prev, [name]: error }));
      }
    }
  }, []);

  const handleDocumentUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setDocument(file);
    setExtractedData(null);
    setAutoFilled(false);
    setVerificationResult(null);
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setDocumentPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setDocumentPreview(null);
    }
  }, []);

  const handleExtractAndFill = async () => {
    if (!document) return;
    
    setIsExtracting(true);
    try {
      const result = await verification.extractDocumentData(document);
      
      if (result.success && result.formData) {
        // Auto-fill the form with extracted data
        setFormData(prev => ({
          ...prev,
          ...result.formData
        }));
        setExtractedData(result);
        setAutoFilled(true);
        setErrors({}); // Clear any previous errors
        
        // Mark fields as touched so validation shows
        const newTouched = {};
        Object.keys(result.formData).forEach(key => {
          if (result.formData[key]) newTouched[key] = true;
        });
        setTouched(newTouched);
        
        console.log('✅ Form auto-filled with extracted data');
      } else {
        alert('Failed to extract data from document: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Extraction error:', err);
      alert('Failed to extract data: ' + err.message);
    } finally {
      setIsExtracting(false);
    }
  };

  const removeDocument = useCallback(() => {
    setDocument(null);
    setDocumentPreview(null);
    setVerificationResult(null);
    setExtractedData(null);
    setAutoFilled(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handlePreVerify = async () => {
    if (!document) return;
    
    // Validate that required fields are filled before pre-verification
    const requiredForVerification = ['age', 'gender', 'bloodType', 'diagnosis', 'biomarker'];
    const missingFields = requiredForVerification.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      // Mark missing fields as touched to show errors
      const newTouched = {};
      const newErrors = {};
      missingFields.forEach(field => { 
        newTouched[field] = true;
        newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required for verification`;
      });
      setTouched(prev => ({ ...prev, ...newTouched }));
      setErrors(prev => ({ ...prev, ...newErrors }));
      
      // Show alert to user
      alert(`Please fill in the required fields before pre-verifying:\n• ${missingFields.join('\n• ')}`);
      return;
    }
    
    const result = await verification.preVerifyDocument(document, formData);
    setVerificationResult(result);
    setShowVerificationDetails(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const validation = validateHealthData(formData, { fieldsToValidate: REQUIRED_FIELDS });
    if (!validation.isValid) {
      setErrors(validation.errors);
      // Mark all required fields as touched
      const newTouched = {};
      REQUIRED_FIELDS.forEach(field => { newTouched[field] = true; });
      setTouched(prev => ({ ...prev, ...newTouched }));
      return;
    }
    
    // Prepare submission data with all fields for encryption
    // BMI is calculated from height/weight and stored as x10 integer (24.5 -> 245)
    const submissionData = {
      ...formData,
      // Ensure numeric fields are properly formatted
      bmi: bmi ? bmi.toFixed(1) : '', // Will be converted to x10 in encryption
      systolicBP: formData.systolicBP || '',
      diastolicBP: formData.diastolicBP || '',
      ethnicity: formData.ethnicity || '',
      // Verification info
      verification: verificationEnabled ? {
        enabled: true,
        stakeAmount,
        document,
        evidenceType
      } : null
    };
    
    console.log('📋 Submitting health data:', {
      age: submissionData.age,
      gender: submissionData.gender,
      ethnicity: submissionData.ethnicity,
      diagnosis: submissionData.diagnosis,
      biomarker: submissionData.biomarker,
      outcome: submissionData.outcome,
      bmi: submissionData.bmi,
      systolicBP: submissionData.systolicBP,
      diastolicBP: submissionData.diastolicBP
    });
    
    await onSubmit(submissionData);
    
    // Reset form
    setFormData(getDefaultFormState());
    setTouched({});
    setErrors({});
    setDocument(null);
    setDocumentPreview(null);
    setVerificationResult(null);
  };

  // Field status indicator
  const FieldStatus = ({ name, required }) => {
    if (!touched[name] && !formData[name]) return required ? <span className="text-red-400">*</span> : null;
    if (errors[name]) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (formData[name]) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return required ? <span className="text-red-400">*</span> : null;
  };

  // Context info displays
  const ageGroup = formData.age ? getAgeGroup(formData.age) : null;
  const diagCategory = formData.diagnosis ? getDiagnosisCategory(formData.diagnosis) : null;
  const outcomeLevel = formData.outcome ? getOutcomeLevel(formData.outcome) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ============ REQUIRED FIELDS SECTION ============ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2 mb-4">
          <User className="h-5 w-5 text-primary-500" />
          <h3 className="text-lg font-semibold">Required Information</h3>
          <span className="text-xs text-gray-500">(Standard research data)</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Age */}
          <div>
            <label className="flex items-center justify-between text-sm font-medium mb-1">
              <span>Age</span>
              <FieldStatus name="age" required />
            </label>
            <div className="relative">
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="0-120 years"
                min="0"
                max="120"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 
                  ${errors.age ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {formData.age && <span className="absolute right-3 top-2 text-gray-400 text-sm">years</span>}
            </div>
            {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age}</p>}
            {ageGroup && (
              <p className={`text-xs mt-1 text-${ageGroup.color}-600`}>
                {ageGroup.label}
              </p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label className="flex items-center justify-between text-sm font-medium mb-1">
              <span>Gender</span>
              <FieldStatus name="gender" required />
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700
                ${errors.gender ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            >
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
          </div>

          {/* Ethnicity */}
          <div>
            <label className="flex items-center justify-between text-sm font-medium mb-1">
              <span>Ethnicity/Race</span>
              <span className="text-xs text-gray-500">(Optional)</span>
            </label>
            <select
              name="ethnicity"
              value={formData.ethnicity}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700
                ${errors.ethnicity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            >
              <option value="">Select ethnicity (optional)</option>
              {ETHNICITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.ethnicity && <p className="text-red-500 text-xs mt-1">{errors.ethnicity}</p>}
          </div>

          {/* Blood Type */}
          <div>
            <label className="flex items-center justify-between text-sm font-medium mb-1">
              <span>Blood Type</span>
              <FieldStatus name="bloodType" required />
            </label>
            <select
              name="bloodType"
              value={formData.bloodType}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700
                ${errors.bloodType ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            >
              <option value="">Select blood type</option>
              {BLOOD_TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.bloodType && <p className="text-red-500 text-xs mt-1">{errors.bloodType}</p>}
          </div>

          {/* Diagnosis Code */}
          <div className="md:col-span-2 lg:col-span-1">
            <label className="flex items-center justify-between text-sm font-medium mb-1">
              <span className="flex items-center">
                Diagnosis Code
                <button 
                  type="button" 
                  onClick={() => setShowDiagnosisHelper(!showDiagnosisHelper)}
                  className="ml-1 text-gray-400 hover:text-primary-500"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </span>
              <FieldStatus name="diagnosis" required />
            </label>
            <input
              type="number"
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter code (1-9999)"
              min="1"
              max="9999"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700
                ${errors.diagnosis ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.diagnosis && <p className="text-red-500 text-xs mt-1">{errors.diagnosis}</p>}
            {diagCategory && (
              <p className="text-xs mt-1 text-primary-600 dark:text-primary-400">
                {diagCategory.label} ({diagCategory.chapter})
              </p>
            )}
          </div>

          {/* Biomarker */}
          <div className="md:col-span-2 lg:col-span-2">
            <label className="flex items-center justify-between text-sm font-medium mb-1">
              <span className="flex items-center">
                Primary Biomarker
                <button 
                  type="button" 
                  onClick={() => setShowBiomarkerHelper(!showBiomarkerHelper)}
                  className="ml-1 text-gray-400 hover:text-primary-500"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </span>
              <FieldStatus name="biomarker" required />
            </label>
            <input
              type="number"
              name="biomarker"
              value={formData.biomarker}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter primary biomarker value (e.g., glucose: 126)"
              min="0"
              max="65535"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700
                ${errors.biomarker ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.biomarker && <p className="text-red-500 text-xs mt-1">{errors.biomarker}</p>}
          </div>
        </div>

        {/* Diagnosis Helper */}
        {showDiagnosisHelper && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Diagnosis Code Ranges</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {Object.entries(DIAGNOSIS_CATEGORIES).map(([key, cat]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{cat.label}:</span>
                  <span className="font-mono">{cat.min}-{cat.max}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Biomarker Helper */}
        {showBiomarkerHelper && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Common Biomarker Reference Ranges</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {BIOMARKER_REFERENCES.slice(0, 6).map((ref, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{ref.name}:</span>
                  <span className="font-mono">{ref.normal} {ref.unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============ OPTIONAL FIELDS SECTION ============ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-gray-400" />
            <span className="font-medium">Optional Information</span>
            <span className="text-xs text-gray-500">(Height, Weight, Vitals, Lifestyle)</span>
          </div>
          {showOptional ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        
        {showOptional && (
          <div className="px-6 pb-6 space-y-4">
            {/* Anthropometrics */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium mb-3 flex items-center">
                <Droplet className="h-4 w-4 mr-2 text-blue-500" />
                Body Measurements
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Height (cm)</label>
                  <input
                    type="number"
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="170"
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                  {errors.height && <p className="text-red-500 text-xs">{errors.height}</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-500">Weight (kg)</label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="70"
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                  {errors.weight && <p className="text-red-500 text-xs">{errors.weight}</p>}
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">BMI (calculated)</label>
                  <div className="px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-600 border-gray-300 dark:border-gray-600">
                    {bmi ? (
                      <span className={`text-${bmiClass?.color || 'gray'}-600`}>
                        {bmi.toFixed(1)} - {bmiClass?.label}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">Enter height & weight</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Vital Signs */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium mb-3 flex items-center">
                <Heart className="h-4 w-4 mr-2 text-red-500" />
                Vital Signs
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    name="systolicBP"
                    value={formData.systolicBP}
                    onChange={handleChange}
                    placeholder="120"
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    name="diastolicBP"
                    value={formData.diastolicBP}
                    onChange={handleChange}
                    placeholder="80"
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    name="heartRate"
                    value={formData.heartRate}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="72"
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                  {errors.heartRate && <p className="text-red-500 text-xs">{errors.heartRate}</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-500">BP Status</label>
                  <div className="px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-600 border-gray-300 dark:border-gray-600">
                    {bpClass ? (
                      <span className={`text-${bpClass.color}-600 text-sm`}>{bpClass.label}</span>
                    ) : (
                      <span className="text-gray-400 text-sm">Enter BP</span>
                    )}
                  </div>
                </div>
              </div>
              {errors.bloodPressure && <p className="text-red-500 text-xs mt-1">{errors.bloodPressure}</p>}
            </div>

            {/* Lifestyle */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium mb-3 flex items-center">
                <Activity className="h-4 w-4 mr-2 text-green-500" />
                Lifestyle Factors
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Smoking Status</label>
                  <select
                    name="smokingStatus"
                    value={formData.smokingStatus}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  >
                    <option value="">Select...</option>
                    {SMOKING_STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Alcohol Use</label>
                  <select
                    name="alcoholUse"
                    value={formData.alcoholUse}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  >
                    <option value="">Select...</option>
                    {ALCOHOL_USE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Exercise Frequency</label>
                  <select
                    name="exerciseFrequency"
                    value={formData.exerciseFrequency}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  >
                    <option value="">Select...</option>
                    {EXERCISE_FREQUENCY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Treatment Outcome */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium mb-3">Treatment Outcome (0-100)</h4>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  name="outcome"
                  value={formData.outcome}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Score 0-100"
                  min="0"
                  max="100"
                  className="w-32 px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
                {outcomeLevel && (
                  <span className={`text-${outcomeLevel.color}-600 text-sm`}>
                    {outcomeLevel.label} - {outcomeLevel.description}
                  </span>
                )}
              </div>
              {errors.outcome && <p className="text-red-500 text-xs mt-1">{errors.outcome}</p>}
            </div>
          </div>
        )}
      </div>

      {/* ============ DATA CONSENT SECTION ============ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Lock className="h-5 w-5 mr-2 text-primary-500" />
          Data Sharing Consent
        </h3>
        
        <div className="space-y-3">
          {[
            { value: '0', label: 'Aggregate Only', desc: 'Your data can be included in anonymized statistics (averages, counts)' },
            { value: '1', label: 'Individual Access', desc: 'Researchers can access your individual record (with k-anonymity protection). Higher payments.' }
          ].map(option => (
            <label 
              key={option.value}
              className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors
                ${formData.consentLevel === option.value 
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'}`}
            >
              <input
                type="radio"
                name="consentLevel"
                value={option.value}
                checked={formData.consentLevel === option.value}
                onChange={handleChange}
                className="mt-1 mr-3"
              />
              <div>
                <span className="font-medium">{option.label}</span>
                <p className="text-sm text-gray-500">{option.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* ============ VERIFICATION SECTION (Optional) ============ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <FileText className="h-5 w-5 mr-2 text-primary-500" />
            Document Verification
            <span className="ml-2 text-xs text-gray-500">(Optional)</span>
          </h3>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={verificationEnabled}
              onChange={(e) => setVerificationEnabled(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">Enable verification</span>
          </label>
        </div>
        
        {verificationEnabled && (
          <div className="space-y-4">
            {/* Document Upload */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleDocumentUpload}
                className="hidden"
              />
              
              {!document ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 transition-colors"
                >
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Upload medical document (lab report, prescription, etc.)</p>
                  <p className="text-xs text-gray-400 mt-1">We'll extract the data and auto-fill the form</p>
                </button>
              ) : (
                <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-primary-500 mr-2" />
                      <span className="text-sm">{document.name}</span>
                      <span className="text-xs text-gray-400 ml-2">({Math.round(document.size / 1024)} KB)</span>
                    </div>
                    <button type="button" onClick={removeDocument} className="text-gray-400 hover:text-red-500">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {documentPreview && (
                    <img src={documentPreview} alt="Preview" className="mt-3 max-h-32 rounded" />
                  )}
                  
                  {/* Auto-fill status badge */}
                  {autoFilled && (
                    <div className="mt-3 flex items-center text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Form auto-filled from document
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Extract & Auto-Fill Button */}
            {document && !autoFilled && !verificationResult && (
              <button
                type="button"
                onClick={handleExtractAndFill}
                disabled={isExtracting}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Extracting data from document...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5" />
                    <span>Extract & Auto-Fill Form</span>
                  </>
                )}
              </button>
            )}
            
            {/* Extracted Data Summary */}
            {extractedData && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  📄 Extracted from: {extractedData.documentType?.replace('_', ' ')}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-300 space-y-1">
                  {extractedData.providerName && <div>Provider: {extractedData.providerName}</div>}
                  {extractedData.documentDate && <div>Date: {extractedData.documentDate}</div>}
                  {extractedData.allDiagnoses?.length > 0 && (
                    <div>Diagnosis: {extractedData.allDiagnoses.map(d => d.code).join(', ')}</div>
                  )}
                  {extractedData.allBiomarkers?.length > 0 && (
                    <div>Biomarkers found: {extractedData.allBiomarkers.length}</div>
                  )}
                </div>
                <p className="text-xs text-blue-500 mt-2">
                  Review the form values above, then click "Pre-verify" to confirm
                </p>
              </div>
            )}
            
            {/* Verification Result */}
            {verificationResult && (
              <div className={`p-4 rounded-lg ${verificationResult.passed ? 'bg-green-50 dark:bg-green-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">
                    AI Verification: {verificationResult.confidenceScore}%
                  </span>
                  <span className={verificationResult.passed ? 'text-green-600' : 'text-orange-600'}>
                    {verificationResult.passed ? '✓ Passed' : '⚠ Low confidence'}
                  </span>
                </div>
                
                <button
                  type="button"
                  onClick={() => setShowVerificationDetails(!showVerificationDetails)}
                  className="text-sm text-gray-600 flex items-center"
                >
                  {showVerificationDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="ml-1">Details</span>
                </button>
                
                {showVerificationDetails && verificationResult.matches && (
                  <div className="mt-3 space-y-2 text-sm">
                    {Object.entries(verificationResult.matches).map(([field, match]) => (
                      <div key={field} className="flex items-center justify-between">
                        <span className="capitalize">{field}</span>
                        <span className={match.match ? 'text-green-600' : 'text-orange-600'}>
                          {match.match ? '✓' : '✗'} {match.score}% - {match.details}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Pre-verify Button - Show after auto-fill */}
            {document && autoFilled && !verificationResult && (
              <button
                type="button"
                onClick={handlePreVerify}
                disabled={verification.isLoading}
                className="w-full py-2 border border-primary-500 text-primary-500 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-50"
              >
                {verification.isLoading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Verifying...
                  </span>
                ) : (
                  'Pre-verify Document'
                )}
              </button>
            )}
            
            {/* Stake Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Stake Amount (ETH)</label>
              <div className="flex space-x-2">
                {['0.001', '0.01', '0.05', '0.1'].map(amount => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setStakeAmount(amount)}
                    className={`px-3 py-1 text-sm rounded-lg border ${
                      stakeAmount === amount 
                        ? 'bg-primary-500 text-white border-primary-500' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-primary-300'
                    }`}
                  >
                    {amount} ETH
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Higher stake = higher trust score. Stake returned if data verified.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ============ ENCRYPTION NOTICE ============ */}
      <div className="flex items-center space-x-2 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
        <Lock className="h-4 w-4 text-primary-500 flex-shrink-0" />
        <p className="text-xs text-gray-600 dark:text-gray-400">
          All data is encrypted client-side using Fully Homomorphic Encryption (FHE) before submission.
        </p>
      </div>

      {/* ============ SUBMIT BUTTON ============ */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center space-x-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Encrypting & Submitting...</span>
          </>
        ) : (
          <>
            <Lock className="h-5 w-5" />
            <span>Encrypt & Submit Health Record</span>
          </>
        )}
      </button>
    </form>
  );
}
