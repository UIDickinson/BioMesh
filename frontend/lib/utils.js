export function formatAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEther(wei) {
  if (!wei) return '0';
  return (Number(wei) / 1e18).toFixed(4);
}

export function formatTimestamp(timestamp) {
  return new Date(timestamp * 1000).toLocaleDateString();
}

// ============ Clinical Data Validation ============
// Comprehensive medical research data collection
// Organized into REQUIRED (standard research) and OPTIONAL fields

// ============ FIELD REQUIREMENTS ============

/**
 * Standard Research Fields (Required)
 * Minimum fields needed for most clinical research studies
 */
export const REQUIRED_FIELDS = [
  'age',           // Demographics
  'gender',        // Demographics  
  'diagnosis',     // Primary condition
  'bloodType',     // Blood compatibility
  'biomarker'      // Key clinical measurement
];

/**
 * Optional Fields
 * Useful for detailed studies but not always available
 */
export const OPTIONAL_FIELDS = [
  'height',        // For BMI calculation
  'weight',        // For BMI calculation
  'outcome',       // Treatment outcome
  'smokingStatus', // Lifestyle factor
  'alcoholUse',    // Lifestyle factor
  'exerciseFrequency', // Lifestyle factor
  'systolicBP',    // Vital signs
  'diastolicBP',   // Vital signs
  'heartRate',     // Vital signs
  'chronicConditions', // Medical history
  'consentLevel'   // Data sharing preference
];

// ============ DEMOGRAPHICS (Required) ============

/**
 * Gender Options - HL7 FHIR standard
 */
export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male', code: 'M' },
  { value: 'female', label: 'Female', code: 'F' },
  { value: 'other', label: 'Other', code: 'O' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', code: 'U' }
];

/**
 * Ethnicity Options - NIH standard categories
 * Required for FDA drug trials and NIH-funded research
 */
export const ETHNICITY_OPTIONS = [
  { value: 'american_indian', label: 'American Indian or Alaska Native', code: 1 },
  { value: 'asian', label: 'Asian', code: 2 },
  { value: 'black', label: 'Black or African American', code: 3 },
  { value: 'hispanic', label: 'Hispanic or Latino', code: 4 },
  { value: 'pacific_islander', label: 'Native Hawaiian or Pacific Islander', code: 5 },
  { value: 'white', label: 'White', code: 6 },
  { value: 'multiracial', label: 'Two or More Races', code: 7 },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', code: 0 }
];

/**
 * Age Validation (0-120 years)
 */
export function validateAge(age) {
  const num = parseInt(age);
  return !isNaN(num) && num >= 0 && num <= 120;
}

export function getAgeError(age) {
  if (age === '' || age === null || age === undefined) return null;
  const num = parseInt(age);
  if (isNaN(num)) return 'Enter a valid number';
  if (num < 0) return 'Age cannot be negative';
  if (num > 120) return 'Please verify: age exceeds 120';
  return null;
}

export function getAgeGroup(age) {
  const num = parseInt(age);
  if (isNaN(num)) return null;
  if (num < 2) return { label: 'Infant', color: 'purple' };
  if (num < 13) return { label: 'Pediatric', color: 'blue' };
  if (num < 18) return { label: 'Adolescent', color: 'cyan' };
  if (num < 40) return { label: 'Young Adult', color: 'green' };
  if (num < 65) return { label: 'Adult', color: 'yellow' };
  if (num < 80) return { label: 'Senior', color: 'orange' };
  return { label: 'Elderly', color: 'red' };
}

export function calculateAge(dob) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// ============ BLOOD TYPE (Required) ============

export const BLOOD_TYPE_OPTIONS = [
  { value: 'A+', label: 'A Positive (A+)', code: 1 },
  { value: 'A-', label: 'A Negative (A-)', code: 2 },
  { value: 'B+', label: 'B Positive (B+)', code: 3 },
  { value: 'B-', label: 'B Negative (B-)', code: 4 },
  { value: 'AB+', label: 'AB Positive (AB+)', code: 5 },
  { value: 'AB-', label: 'AB Negative (AB-)', code: 6 },
  { value: 'O+', label: 'O Positive (O+)', code: 7 },
  { value: 'O-', label: 'O Negative (O-)', code: 8 },
  { value: 'unknown', label: 'Unknown', code: 0 }
];

// ============ ANTHROPOMETRICS (Optional) ============

export function validateHeight(height) {
  const num = parseFloat(height);
  return !isNaN(num) && num >= 30 && num <= 280;
}

export function getHeightError(height) {
  if (height === '' || height === null || height === undefined) return null;
  const num = parseFloat(height);
  if (isNaN(num)) return 'Enter a valid number';
  if (num < 30) return 'Height seems too low';
  if (num > 280) return 'Height seems too high';
  return null;
}

export function validateWeight(weight) {
  const num = parseFloat(weight);
  return !isNaN(num) && num >= 1 && num <= 500;
}

export function getWeightError(weight) {
  if (weight === '' || weight === null || weight === undefined) return null;
  const num = parseFloat(weight);
  if (isNaN(num)) return 'Enter a valid number';
  if (num < 1) return 'Weight seems too low';
  if (num > 500) return 'Weight seems too high';
  return null;
}

export function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function getBMIClassification(bmi) {
  if (bmi === null || bmi === undefined) return null;
  if (bmi < 16) return { label: 'Severe Underweight', color: 'red', risk: 'high' };
  if (bmi < 17) return { label: 'Moderate Underweight', color: 'orange', risk: 'moderate' };
  if (bmi < 18.5) return { label: 'Mild Underweight', color: 'yellow', risk: 'low' };
  if (bmi < 25) return { label: 'Normal', color: 'green', risk: 'low' };
  if (bmi < 30) return { label: 'Overweight', color: 'yellow', risk: 'moderate' };
  if (bmi < 35) return { label: 'Obese Class I', color: 'orange', risk: 'high' };
  if (bmi < 40) return { label: 'Obese Class II', color: 'red', risk: 'high' };
  return { label: 'Obese Class III', color: 'red', risk: 'very high' };
}

// ============ LIFESTYLE FACTORS (Optional) ============

export const SMOKING_STATUS_OPTIONS = [
  { value: 'never', label: 'Never Smoker', code: 0 },
  { value: 'former', label: 'Former Smoker', code: 1 },
  { value: 'current_light', label: 'Current Smoker (< 10/day)', code: 2 },
  { value: 'current_moderate', label: 'Current Smoker (10-20/day)', code: 3 },
  { value: 'current_heavy', label: 'Current Smoker (> 20/day)', code: 4 },
  { value: 'unknown', label: 'Unknown', code: 9 }
];

export const ALCOHOL_USE_OPTIONS = [
  { value: 'none', label: 'None', code: 0 },
  { value: 'occasional', label: 'Occasional (1-2 drinks/week)', code: 1 },
  { value: 'moderate', label: 'Moderate (3-7 drinks/week)', code: 2 },
  { value: 'heavy', label: 'Heavy (8-14 drinks/week)', code: 3 },
  { value: 'very_heavy', label: 'Very Heavy (> 14 drinks/week)', code: 4 },
  { value: 'unknown', label: 'Unknown', code: 9 }
];

export const EXERCISE_FREQUENCY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary (little to no exercise)', code: 0 },
  { value: 'light', label: 'Light (1-2 days/week)', code: 1 },
  { value: 'moderate', label: 'Moderate (3-4 days/week)', code: 2 },
  { value: 'active', label: 'Active (5-6 days/week)', code: 3 },
  { value: 'very_active', label: 'Very Active (daily intense)', code: 4 },
  { value: 'unknown', label: 'Unknown', code: 9 }
];

// ============ MEDICAL HISTORY (Optional) ============

export const CHRONIC_CONDITIONS = [
  { id: 'hypertension', label: 'Hypertension (High Blood Pressure)' },
  { id: 'diabetes_type1', label: 'Type 1 Diabetes' },
  { id: 'diabetes_type2', label: 'Type 2 Diabetes' },
  { id: 'heart_disease', label: 'Heart Disease' },
  { id: 'stroke', label: 'Stroke/TIA' },
  { id: 'asthma', label: 'Asthma' },
  { id: 'copd', label: 'COPD' },
  { id: 'cancer', label: 'Cancer (any type)' },
  { id: 'arthritis', label: 'Arthritis' },
  { id: 'kidney_disease', label: 'Chronic Kidney Disease' },
  { id: 'liver_disease', label: 'Liver Disease' },
  { id: 'thyroid', label: 'Thyroid Disorder' },
  { id: 'depression', label: 'Depression' },
  { id: 'anxiety', label: 'Anxiety Disorder' },
  { id: 'autoimmune', label: 'Autoimmune Disease' },
  { id: 'none', label: 'None of the above' }
];

// ============ VITAL SIGNS (Optional) ============

export function validateBloodPressure(systolic, diastolic) {
  const sys = parseInt(systolic);
  const dia = parseInt(diastolic);
  return !isNaN(sys) && !isNaN(dia) && 
         sys >= 60 && sys <= 250 && 
         dia >= 30 && dia <= 150 &&
         sys > dia;
}

export function getBloodPressureClassification(systolic, diastolic) {
  if (!systolic || !diastolic) return null;
  const sys = parseInt(systolic);
  const dia = parseInt(diastolic);
  
  if (sys > 180 || dia > 120) return { label: 'Hypertensive Crisis', color: 'red', urgent: true };
  if (sys >= 140 || dia >= 90) return { label: 'Hypertension Stage 2', color: 'red', urgent: false };
  if (sys >= 130 || dia >= 80) return { label: 'Hypertension Stage 1', color: 'orange', urgent: false };
  if (sys >= 120 && dia < 80) return { label: 'Elevated', color: 'yellow', urgent: false };
  if (sys < 90 || dia < 60) return { label: 'Low', color: 'blue', urgent: false };
  return { label: 'Normal', color: 'green', urgent: false };
}

export function validateHeartRate(hr) {
  const num = parseInt(hr);
  return !isNaN(num) && num >= 20 && num <= 300;
}

export function getHeartRateError(hr) {
  if (hr === '' || hr === null || hr === undefined) return null;
  const num = parseInt(hr);
  if (isNaN(num)) return 'Enter a valid number';
  if (num < 20) return 'Heart rate seems too low';
  if (num > 300) return 'Heart rate seems too high';
  return null;
}

// ============ DIAGNOSIS CODES (Required) ============

export function validateOutcome(outcome) {
  const num = parseInt(outcome);
  return !isNaN(num) && num >= 0 && num <= 100;
}

export function getOutcomeError(outcome) {
  if (outcome === '' || outcome === null || outcome === undefined) return null;
  const num = parseInt(outcome);
  if (isNaN(num)) return 'Enter a valid number';
  if (num < 0) return 'Outcome cannot be negative';
  if (num > 100) return 'Maximum outcome score is 100';
  return null;
}

export function getOutcomeLevel(outcome) {
  const num = parseInt(outcome);
  if (isNaN(num)) return null;
  if (num <= 20) return { label: 'Poor', color: 'red', description: 'No significant improvement' };
  if (num <= 40) return { label: 'Minimal', color: 'orange', description: 'Slight improvement' };
  if (num <= 60) return { label: 'Moderate', color: 'yellow', description: 'Noticeable improvement' };
  if (num <= 80) return { label: 'Good', color: 'green', description: 'Significant improvement' };
  return { label: 'Excellent', color: 'emerald', description: 'Full or near-full recovery' };
}

/**
 * Diagnosis Categories - Simplified ICD-10 chapters
 */
export const DIAGNOSIS_CATEGORIES = {
  infectious: { min: 1, max: 99, label: 'Infectious Disease', chapter: 'A00-B99', examples: 'COVID, TB, HIV, Hepatitis' },
  neoplasms: { min: 100, max: 199, label: 'Neoplasms/Cancer', chapter: 'C00-D49', examples: 'Breast, Lung, Colon cancer' },
  blood: { min: 200, max: 249, label: 'Blood Disorders', chapter: 'D50-D89', examples: 'Anemia, Hemophilia' },
  immune: { min: 250, max: 299, label: 'Immune Disorders', chapter: 'D80-D89', examples: 'Immunodeficiency, Allergies' },
  endocrine: { min: 300, max: 399, label: 'Endocrine/Metabolic', chapter: 'E00-E89', examples: 'Diabetes, Thyroid, Obesity' },
  mental: { min: 400, max: 499, label: 'Mental Health', chapter: 'F00-F99', examples: 'Depression, Anxiety, PTSD' },
  nervous: { min: 500, max: 599, label: 'Nervous System', chapter: 'G00-G99', examples: 'Epilepsy, Parkinson, MS' },
  circulatory: { min: 600, max: 699, label: 'Cardiovascular', chapter: 'I00-I99', examples: 'Heart disease, Hypertension' },
  respiratory: { min: 700, max: 799, label: 'Respiratory', chapter: 'J00-J99', examples: 'Asthma, COPD, Pneumonia' },
  digestive: { min: 800, max: 899, label: 'Digestive', chapter: 'K00-K95', examples: 'IBD, GERD, Liver disease' },
  musculoskeletal: { min: 900, max: 999, label: 'Musculoskeletal', chapter: 'M00-M99', examples: 'Arthritis, Osteoporosis' },
  other: { min: 1000, max: 9999, label: 'Other/Research', chapter: 'Various', examples: 'Research-specific codes' }
};

export function validateDiagnosis(code) {
  const num = parseInt(code);
  return !isNaN(num) && num >= 1 && num <= 9999;
}

export function getDiagnosisError(code) {
  if (code === '' || code === null || code === undefined) return null;
  const num = parseInt(code);
  if (isNaN(num)) return 'Enter a valid diagnosis code';
  if (num < 1) return 'Diagnosis code must be at least 1';
  if (num > 9999) return 'Diagnosis code cannot exceed 9999';
  return null;
}

export function getDiagnosisCategory(code) {
  const num = parseInt(code);
  if (isNaN(num)) return null;
  
  for (const [key, cat] of Object.entries(DIAGNOSIS_CATEGORIES)) {
    if (num >= cat.min && num <= cat.max) {
      return cat;
    }
  }
  return DIAGNOSIS_CATEGORIES.other;
}

// ============ BIOMARKER (Required) ============

export function validateBiomarker(value) {
  const num = parseInt(value);
  return !isNaN(num) && num >= 0 && num <= 65535;
}

export function getBiomarkerError(value) {
  if (value === '' || value === null || value === undefined) return null;
  const num = parseInt(value);
  if (isNaN(num)) return 'Enter a valid number';
  if (num < 0) return 'Biomarker value cannot be negative';
  if (num > 65535) return 'Value exceeds maximum (65535)';
  return null;
}

export const BIOMARKER_REFERENCES = [
  { name: 'Blood Glucose (fasting)', normal: '70-100', unit: 'mg/dL' },
  { name: 'HbA1c', normal: '4.0-5.6', unit: '%', note: 'Store as value×10 (e.g., 56 = 5.6%)' },
  { name: 'Total Cholesterol', normal: '< 200', unit: 'mg/dL' },
  { name: 'LDL Cholesterol', normal: '< 100', unit: 'mg/dL' },
  { name: 'HDL Cholesterol', normal: '> 40', unit: 'mg/dL' },
  { name: 'Triglycerides', normal: '< 150', unit: 'mg/dL' },
  { name: 'Creatinine', normal: '0.7-1.3', unit: 'mg/dL', note: 'Store as value×10' },
  { name: 'eGFR', normal: '> 90', unit: 'mL/min' },
  { name: 'Hemoglobin', normal: '12-17', unit: 'g/dL', note: 'Store as value×10' },
  { name: 'WBC Count', normal: '4.5-11', unit: 'K/uL', note: 'Store as value×10' },
];

// ============ COMPREHENSIVE VALIDATION ============

/**
 * Validate all health data fields
 * Separates required vs optional validation
 */
export function validateHealthData(data, options = {}) {
  const { fieldsToValidate = REQUIRED_FIELDS } = options;
  const errors = {};
  
  // === REQUIRED FIELDS ===
  
  if (fieldsToValidate.includes('age')) {
    if (!data.age && data.age !== 0) {
      errors.age = 'Age is required';
    } else {
      const ageError = getAgeError(data.age);
      if (ageError) errors.age = ageError;
    }
  }
  
  if (fieldsToValidate.includes('gender')) {
    if (!data.gender || data.gender === '') {
      errors.gender = 'Gender is required';
    }
  }
  
  if (fieldsToValidate.includes('diagnosis')) {
    if (!data.diagnosis) {
      errors.diagnosis = 'Diagnosis code is required';
    } else {
      const diagnosisError = getDiagnosisError(data.diagnosis);
      if (diagnosisError) errors.diagnosis = diagnosisError;
    }
  }
  
  if (fieldsToValidate.includes('bloodType')) {
    if (!data.bloodType || data.bloodType === '') {
      errors.bloodType = 'Blood type is required';
    }
  }
  
  if (fieldsToValidate.includes('biomarker')) {
    if (!data.biomarker && data.biomarker !== 0) {
      errors.biomarker = 'Primary biomarker is required';
    } else {
      const biomarkerError = getBiomarkerError(data.biomarker);
      if (biomarkerError) errors.biomarker = biomarkerError;
    }
  }
  
  // === OPTIONAL FIELDS (validate only if provided) ===
  
  if (data.height) {
    const heightError = getHeightError(data.height);
    if (heightError) errors.height = heightError;
  }
  
  if (data.weight) {
    const weightError = getWeightError(data.weight);
    if (weightError) errors.weight = weightError;
  }
  
  if (data.outcome) {
    const outcomeError = getOutcomeError(data.outcome);
    if (outcomeError) errors.outcome = outcomeError;
  }
  
  if (data.systolicBP || data.diastolicBP) {
    if (data.systolicBP && data.diastolicBP) {
      if (!validateBloodPressure(data.systolicBP, data.diastolicBP)) {
        errors.bloodPressure = 'Invalid blood pressure values';
      }
    } else {
      errors.bloodPressure = 'Both systolic and diastolic required';
    }
  }
  
  if (data.heartRate) {
    const hrError = getHeartRateError(data.heartRate);
    if (hrError) errors.heartRate = hrError;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// ============ DATA ENCODING FOR BLOCKCHAIN ============

export function encodePatientData(data) {
  const genderCode = GENDER_OPTIONS.findIndex(g => g.value === data.gender);
  const bloodTypeCode = BLOOD_TYPE_OPTIONS.find(b => b.value === data.bloodType)?.code || 0;
  const smokingCode = SMOKING_STATUS_OPTIONS.find(s => s.value === data.smokingStatus)?.code || 0;
  const alcoholCode = ALCOHOL_USE_OPTIONS.find(a => a.value === data.alcoholUse)?.code || 0;
  const exerciseCode = EXERCISE_FREQUENCY_OPTIONS.find(e => e.value === data.exerciseFrequency)?.code || 0;
  
  let bmiEncoded = 0;
  if (data.height && data.weight) {
    const bmi = calculateBMI(parseFloat(data.weight), parseFloat(data.height));
    bmiEncoded = Math.round(bmi * 10);
  }
  
  return {
    age: parseInt(data.age) || 0,
    gender: genderCode >= 0 ? genderCode : 3,
    bloodType: bloodTypeCode,
    smokingStatus: smokingCode,
    alcoholUse: alcoholCode,
    exerciseFrequency: exerciseCode,
    diagnosis: parseInt(data.diagnosis) || 0,
    outcome: parseInt(data.outcome) || 0,
    bmi: bmiEncoded,
    systolicBP: parseInt(data.systolicBP) || 0,
    diastolicBP: parseInt(data.diastolicBP) || 0,
    heartRate: parseInt(data.heartRate) || 0,
    biomarker: parseInt(data.biomarker) || 0,
    heightCm: parseFloat(data.height) || 0,
    weightKg: parseFloat(data.weight) || 0
  };
}

export function decodePatientData(encoded) {
  return {
    age: encoded.age,
    gender: GENDER_OPTIONS[encoded.gender]?.value || 'prefer_not_to_say',
    bloodType: BLOOD_TYPE_OPTIONS.find(b => b.code === encoded.bloodType)?.value || 'unknown',
    smokingStatus: SMOKING_STATUS_OPTIONS.find(s => s.code === encoded.smokingStatus)?.value || 'unknown',
    alcoholUse: ALCOHOL_USE_OPTIONS.find(a => a.code === encoded.alcoholUse)?.value || 'unknown',
    exerciseFrequency: EXERCISE_FREQUENCY_OPTIONS.find(e => e.code === encoded.exerciseFrequency)?.value || 'unknown',
    diagnosis: encoded.diagnosis,
    outcome: encoded.outcome,
    bmi: encoded.bmi / 10,
    systolicBP: encoded.systolicBP,
    diastolicBP: encoded.diastolicBP,
    heartRate: encoded.heartRate,
    biomarker: encoded.biomarker,
    height: encoded.heightCm,
    weight: encoded.weightKg
  };
}

// ============ FORM FIELD CONFIGURATION ============

export const FORM_FIELDS = {
  required: [
    {
      name: 'age',
      label: 'Age',
      type: 'number',
      placeholder: 'Enter age (0-120)',
      min: 0,
      max: 120,
      unit: 'years',
      helperText: 'Patient age in years',
      validation: getAgeError
    },
    {
      name: 'gender',
      label: 'Gender',
      type: 'select',
      options: GENDER_OPTIONS,
      helperText: 'Select patient gender'
    },
    {
      name: 'bloodType',
      label: 'Blood Type',
      type: 'select',
      options: BLOOD_TYPE_OPTIONS,
      helperText: 'ABO and Rh blood type'
    },
    {
      name: 'diagnosis',
      label: 'Diagnosis Code',
      type: 'number',
      placeholder: 'Enter code (1-9999)',
      min: 1,
      max: 9999,
      helperText: 'Simplified ICD-10 category',
      validation: getDiagnosisError,
      showHelper: true
    },
    {
      name: 'biomarker',
      label: 'Primary Biomarker',
      type: 'number',
      placeholder: 'Enter biomarker value',
      min: 0,
      max: 65535,
      helperText: 'Key clinical measurement',
      validation: getBiomarkerError,
      showHelper: true
    }
  ],
  optional: [
    {
      name: 'height',
      label: 'Height',
      type: 'number',
      placeholder: 'Height in cm',
      min: 30,
      max: 280,
      unit: 'cm',
      helperText: 'For BMI calculation',
      validation: getHeightError
    },
    {
      name: 'weight',
      label: 'Weight',
      type: 'number',
      placeholder: 'Weight in kg',
      min: 1,
      max: 500,
      unit: 'kg',
      helperText: 'For BMI calculation',
      validation: getWeightError
    },
    {
      name: 'outcome',
      label: 'Treatment Outcome',
      type: 'number',
      placeholder: 'Score 0-100',
      min: 0,
      max: 100,
      unit: '%',
      helperText: 'Treatment effectiveness',
      validation: getOutcomeError
    },
    {
      name: 'smokingStatus',
      label: 'Smoking Status',
      type: 'select',
      options: SMOKING_STATUS_OPTIONS,
      helperText: 'Smoking history'
    },
    {
      name: 'alcoholUse',
      label: 'Alcohol Use',
      type: 'select',
      options: ALCOHOL_USE_OPTIONS,
      helperText: 'Weekly consumption'
    },
    {
      name: 'exerciseFrequency',
      label: 'Exercise Frequency',
      type: 'select',
      options: EXERCISE_FREQUENCY_OPTIONS,
      helperText: 'Weekly activity level'
    },
    {
      name: 'systolicBP',
      label: 'Systolic BP',
      type: 'number',
      placeholder: 'mmHg',
      min: 60,
      max: 250,
      unit: 'mmHg',
      helperText: 'Top number',
      paired: 'diastolicBP'
    },
    {
      name: 'diastolicBP',
      label: 'Diastolic BP',
      type: 'number',
      placeholder: 'mmHg',
      min: 30,
      max: 150,
      unit: 'mmHg',
      helperText: 'Bottom number',
      paired: 'systolicBP'
    },
    {
      name: 'heartRate',
      label: 'Heart Rate',
      type: 'number',
      placeholder: 'bpm',
      min: 20,
      max: 300,
      unit: 'bpm',
      helperText: 'Resting heart rate',
      validation: getHeartRateError
    }
  ]
};

export function getDefaultFormState() {
  return {
    // Required demographics
    age: '',
    gender: '',
    ethnicity: '',
    bloodType: '',
    // Required clinical
    diagnosis: '',
    biomarker: '',
    // Optional vitals
    height: '',
    weight: '',
    outcome: '',
    systolicBP: '',
    diastolicBP: '',
    heartRate: '',
    // Optional lifestyle
    smokingStatus: '',
    alcoholUse: '',
    exerciseFrequency: '',
    // Data sharing
    consentLevel: '0'
  };
}
