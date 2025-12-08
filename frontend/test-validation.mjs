/**
 * Test script for clinical data validation utilities
 * Run with: node --experimental-modules test-validation.mjs
 */

// Import all validation functions (using dynamic import for ES modules)
import {
  validateAge, getAgeError, getAgeGroup,
  validateHeight, getHeightError,
  validateWeight, getWeightError,
  calculateBMI, getBMIClassification,
  validateBloodPressure, getBloodPressureClassification,
  validateHeartRate, getHeartRateError,
  validateDiagnosis, getDiagnosisError, getDiagnosisCategory,
  validateBiomarker, getBiomarkerError,
  validateOutcome, getOutcomeError, getOutcomeLevel,
  validateHealthData,
  REQUIRED_FIELDS,
  GENDER_OPTIONS,
  BLOOD_TYPE_OPTIONS,
  getDefaultFormState
} from './lib/utils.js';

console.log('🧪 Testing Clinical Data Validation Utilities\n');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

function test(name, condition) {
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    failed++;
  }
}

// ============ Age Validation Tests ============
console.log('\n📊 Age Validation');
console.log('-'.repeat(40));

test('Valid age 45', validateAge(45) === true);
test('Valid age 0 (newborn)', validateAge(0) === true);
test('Valid age 120', validateAge(120) === true);
test('Invalid age -1', validateAge(-1) === false);
test('Invalid age 121', validateAge(121) === false);
test('Invalid age NaN', validateAge('abc') === false);

test('Age error for 200', getAgeError(200) === 'Please verify: age exceeds 120');
test('Age error for -5', getAgeError(-5) === 'Age cannot be negative');
test('No age error for 50', getAgeError(50) === null);

test('Age group infant (1)', getAgeGroup(1)?.label === 'Infant');
test('Age group pediatric (10)', getAgeGroup(10)?.label === 'Pediatric');
test('Age group adult (50)', getAgeGroup(50)?.label === 'Adult');
test('Age group senior (70)', getAgeGroup(70)?.label === 'Senior');

// ============ Height/Weight Validation Tests ============
console.log('\n📊 Height/Weight Validation');
console.log('-'.repeat(40));

test('Valid height 170cm', validateHeight(170) === true);
test('Invalid height 20cm', validateHeight(20) === false);
test('Invalid height 300cm', validateHeight(300) === false);

test('Valid weight 70kg', validateWeight(70) === true);
test('Invalid weight 0kg', validateWeight(0) === false);
test('Invalid weight 600kg', validateWeight(600) === false);

// ============ BMI Calculation Tests ============
console.log('\n📊 BMI Calculation');
console.log('-'.repeat(40));

const bmi = calculateBMI(70, 170);
test('BMI calculation (70kg, 170cm) ≈ 24.2', Math.abs(bmi - 24.22) < 0.1);

test('BMI classification normal (22)', getBMIClassification(22)?.label === 'Normal');
test('BMI classification overweight (27)', getBMIClassification(27)?.label === 'Overweight');
test('BMI classification obese (32)', getBMIClassification(32)?.label === 'Obese Class I');

// ============ Blood Pressure Tests ============
console.log('\n📊 Blood Pressure Validation');
console.log('-'.repeat(40));

test('Valid BP 120/80', validateBloodPressure(120, 80) === true);
test('Invalid BP (systolic < diastolic)', validateBloodPressure(70, 80) === false);
test('Invalid BP (too high)', validateBloodPressure(300, 80) === false);

test('BP classification normal', getBloodPressureClassification(115, 75)?.label === 'Normal');
test('BP classification elevated', getBloodPressureClassification(125, 75)?.label === 'Elevated');
test('BP classification hypertension 1', getBloodPressureClassification(135, 85)?.label === 'Hypertension Stage 1');
test('BP classification hypertension 2', getBloodPressureClassification(145, 95)?.label === 'Hypertension Stage 2');

// ============ Heart Rate Tests ============
console.log('\n📊 Heart Rate Validation');
console.log('-'.repeat(40));

test('Valid HR 72', validateHeartRate(72) === true);
test('Invalid HR 10', validateHeartRate(10) === false);
test('Invalid HR 400', validateHeartRate(400) === false);

// ============ Diagnosis Code Tests ============
console.log('\n📊 Diagnosis Code Validation');
console.log('-'.repeat(40));

test('Valid diagnosis 350 (diabetes)', validateDiagnosis(350) === true);
test('Invalid diagnosis 0', validateDiagnosis(0) === false);
test('Invalid diagnosis 10000', validateDiagnosis(10000) === false);

test('Diagnosis category infectious (50)', getDiagnosisCategory(50)?.label === 'Infectious Disease');
test('Diagnosis category endocrine (350)', getDiagnosisCategory(350)?.label === 'Endocrine/Metabolic');
test('Diagnosis category cardiovascular (650)', getDiagnosisCategory(650)?.label === 'Cardiovascular');

// ============ Biomarker Tests ============
console.log('\n📊 Biomarker Validation');
console.log('-'.repeat(40));

test('Valid biomarker 126', validateBiomarker(126) === true);
test('Invalid biomarker -1', validateBiomarker(-1) === false);
test('Invalid biomarker 70000', validateBiomarker(70000) === false);

// ============ Outcome Tests ============
console.log('\n📊 Outcome Validation');
console.log('-'.repeat(40));

test('Valid outcome 75', validateOutcome(75) === true);
test('Invalid outcome -10', validateOutcome(-10) === false);
test('Invalid outcome 150', validateOutcome(150) === false);

test('Outcome level poor (15)', getOutcomeLevel(15)?.label === 'Poor');
test('Outcome level good (75)', getOutcomeLevel(75)?.label === 'Good');
test('Outcome level excellent (95)', getOutcomeLevel(95)?.label === 'Excellent');

// ============ Comprehensive Validation Tests ============
console.log('\n📊 Comprehensive Form Validation');
console.log('-'.repeat(40));

const validData = {
  age: 45,
  gender: 'male',
  bloodType: 'O+',
  diagnosis: 350,
  biomarker: 126,
  height: 170,
  weight: 70,
  outcome: 75
};

const validResult = validateHealthData(validData);
test('Valid form data passes', validResult.isValid === true);
test('Valid form has no errors', Object.keys(validResult.errors).length === 0);

const invalidData = {
  age: 200, // Invalid
  gender: '', // Missing
  bloodType: 'O+',
  diagnosis: 0, // Invalid
  biomarker: 126
};

const invalidResult = validateHealthData(invalidData);
test('Invalid form data fails', invalidResult.isValid === false);
test('Invalid form has age error', invalidResult.errors.age !== undefined);
test('Invalid form has gender error', invalidResult.errors.gender !== undefined);
test('Invalid form has diagnosis error', invalidResult.errors.diagnosis !== undefined);

// ============ Options Arrays ============
console.log('\n📊 Options Arrays');
console.log('-'.repeat(40));

test('REQUIRED_FIELDS has 5 items', REQUIRED_FIELDS.length === 5);
test('GENDER_OPTIONS has 4 items', GENDER_OPTIONS.length === 4);
test('BLOOD_TYPE_OPTIONS has 9 items', BLOOD_TYPE_OPTIONS.length === 9);

// ============ Default Form State ============
console.log('\n📊 Default Form State');
console.log('-'.repeat(40));

const defaultState = getDefaultFormState();
test('Default state has age field', defaultState.age === '');
test('Default state has consentLevel', defaultState.consentLevel === '0');

// ============ Summary ============
console.log('\n' + '='.repeat(60));
console.log(`📋 RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  console.log('\n⚠️  Some tests failed! Please review the validation functions.');
  process.exit(1);
} else {
  console.log('\n✅ All validation tests passed!');
  process.exit(0);
}
