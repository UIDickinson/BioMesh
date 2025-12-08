import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

/**
 * AI Document Verification Oracle API
 * 
 * This endpoint:
 * 1. Accepts medical document uploads (lab reports, prescriptions, etc.)
 * 2. Calls AI vision model to extract medical data
 * 3. Compares extracted data with submitted form values
 * 4. Returns confidence score and extraction summary
 * 
 * In production, this would be a separate oracle service with
 * proper key management and rate limiting.
 */

// Supported document types
const SUPPORTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Extract medical data from document using AI Vision
 * Currently supports OpenAI GPT-4V and Anthropic Claude
 */
async function extractMedicalData(base64Image, mimeType) {
  // Try OpenAI first, fall back to Anthropic
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  
  if (!openaiKey && !anthropicKey) {
    throw new Error('No AI API key configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.');
  }
  
  const extractionPrompt = `You are a medical document verification AI. Analyze this medical document and extract the following information if present:

1. Patient Demographics:
   - Age or Date of Birth (calculate age if DOB given)
   - Gender/Sex (Male, Female, Other, or null if not specified)
   - Ethnicity/Race (use NIH categories: American Indian, Asian, Black, Hispanic, Pacific Islander, White, Multiracial, or null if not specified)
   - Blood Type (A+, A-, B+, B-, AB+, AB-, O+, O-, or null if not specified)
   - Any patient identifiers (redact for privacy, just confirm present)

2. Medical Data:
   - Diagnosis codes (ICD-10, ICD-9, or description)
   - Lab results/biomarkers (glucose, HbA1c, cholesterol, creatinine, etc.)
   - Vitals: Blood pressure (systolic/diastolic mmHg), BMI, height, weight
   - Treatment information or outcomes

3. Document Metadata:
   - Document type (lab report, prescription, medical record, insurance claim, provider letter)
   - Healthcare provider/facility name
   - Document date
   - Signatures or stamps present (yes/no)

4. Authenticity Indicators:
   - Does this appear to be a genuine medical document?
   - Are there any signs of manipulation or inconsistency?
   - Is the format consistent with standard medical documents?

Return your analysis as JSON with this exact structure:
{
  "patientAge": <number or null>,
  "patientGender": "<male|female|other|null>",
  "patientEthnicity": "<american_indian|asian|black|hispanic|pacific_islander|white|multiracial|null>",
  "bloodType": "<A+|A-|B+|B-|AB+|AB-|O+|O-|null>",
  "systolicBP": <number or null>,
  "diastolicBP": <number or null>,
  "bmi": <number or null>,
  "diagnosisCodes": [{"code": "<string>", "description": "<string>"}],
  "biomarkers": [{"name": "<string>", "value": <number>, "unit": "<string>"}],
  "treatmentOutcome": <number 0-100 or null>,
  "documentType": "<lab_report|prescription|medical_record|insurance_claim|provider_letter|unknown>",
  "providerName": "<string or null>",
  "documentDate": "<ISO date string or null>",
  "hasSignature": <boolean>,
  "authenticityScore": <number 0-100>,
  "authenticityNotes": "<string explaining authenticity assessment>",
  "extractionConfidence": <number 0-100>,
  "rawExtraction": "<brief summary of what was found>"
}

Be conservative with authenticity scores - only give high scores (>80) if the document clearly appears genuine with proper formatting, letterhead, and signatures.`;

  if (openaiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: extractionPrompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                    detail: 'high'
                  }
                }
              ]
            }
          ],
          max_tokens: 2000,
          response_format: { type: 'json_object' }
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('OpenAI error:', error);
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      return JSON.parse(content);
    } catch (err) {
      console.error('OpenAI extraction failed:', err);
      if (anthropicKey) {
        console.log('Falling back to Anthropic...');
      } else {
        throw err;
      }
    }
  }
  
  if (anthropicKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64Image
                }
              },
              { type: 'text', text: extractionPrompt }
            ]
          }
        ]
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Anthropic error:', error);
      throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    const content = data.content[0]?.text;
    
    // Extract JSON from response (Claude might wrap it in markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response as JSON');
    }
    return JSON.parse(jsonMatch[0]);
  }
  
  throw new Error('No AI API available');
}

/**
 * Compare extracted data with submitted form data
 * Returns match scores for each field
 */
function compareData(extracted, submitted) {
  console.log('🔍 compareData called with:');
  console.log('   extracted:', JSON.stringify(extracted, null, 2));
  console.log('   submitted:', JSON.stringify(submitted, null, 2));
  
  const matches = {
    age: { match: false, score: 0, details: '' },
    gender: { match: false, score: 0, details: '' },
    ethnicity: { match: false, score: 0, details: '' },
    bloodType: { match: false, score: 0, details: '' },
    bloodPressure: { match: false, score: 0, details: '' },
    bmi: { match: false, score: 0, details: '' },
    diagnosis: { match: false, score: 0, details: '' },
    biomarker: { match: false, score: 0, details: '' },
    outcome: { match: false, score: 0, details: '' }
  };
  
  // Age comparison (within 1 year tolerance)
  console.log('   Age check: extracted.patientAge=', extracted.patientAge, 'submitted.age=', submitted.age);
  if (extracted.patientAge !== null && submitted.age) {
    const ageDiff = Math.abs(extracted.patientAge - parseInt(submitted.age));
    console.log('   Age diff:', ageDiff);
    if (ageDiff === 0) {
      matches.age = { match: true, score: 100, details: 'Exact match' };
    } else if (ageDiff <= 1) {
      matches.age = { match: true, score: 90, details: 'Within 1 year tolerance' };
    } else {
      matches.age = { match: false, score: 0, details: `Mismatch: doc=${extracted.patientAge}, form=${submitted.age}` };
    }
  } else if (extracted.patientAge === null) {
    matches.age = { match: false, score: 50, details: 'Age not found in document' };
  } else {
    matches.age = { match: false, score: 0, details: 'Missing data: age not submitted' };
  }
  
  // Gender comparison
  console.log('   Gender check: extracted.patientGender=', extracted.patientGender, 'submitted.gender=', submitted.gender);
  if (extracted.patientGender && submitted.gender) {
    const extractedGender = extracted.patientGender.toLowerCase();
    const submittedGender = submitted.gender.toLowerCase();
    if (extractedGender === submittedGender) {
      matches.gender = { match: true, score: 100, details: 'Exact match' };
    } else if (extractedGender === 'other' || submittedGender === 'other' || 
               submittedGender === 'prefer_not_to_say') {
      matches.gender = { match: true, score: 70, details: 'Flexible match (other/prefer not to say)' };
    } else {
      matches.gender = { match: false, score: 0, details: `Mismatch: doc=${extractedGender}, form=${submittedGender}` };
    }
  } else if (!extracted.patientGender) {
    matches.gender = { match: false, score: 50, details: 'Gender not found in document' };
  } else {
    matches.gender = { match: false, score: 0, details: 'Missing data: gender not submitted' };
  }
  
  // Ethnicity comparison
  console.log('   Ethnicity check: extracted.patientEthnicity=', extracted.patientEthnicity, 'submitted.ethnicity=', submitted.ethnicity);
  if (extracted.patientEthnicity && submitted.ethnicity) {
    const extractedEth = extracted.patientEthnicity.toLowerCase().replace(/\s+/g, '_');
    const submittedEth = submitted.ethnicity.toLowerCase().replace(/\s+/g, '_');
    if (extractedEth === submittedEth) {
      matches.ethnicity = { match: true, score: 100, details: 'Exact match' };
    } else if (extractedEth.includes(submittedEth) || submittedEth.includes(extractedEth)) {
      matches.ethnicity = { match: true, score: 80, details: 'Partial match' };
    } else {
      matches.ethnicity = { match: false, score: 0, details: `Mismatch: doc=${extractedEth}, form=${submittedEth}` };
    }
  } else if (!extracted.patientEthnicity) {
    matches.ethnicity = { match: false, score: 60, details: 'Ethnicity not found in document (often not included)' };
  } else {
    matches.ethnicity = { match: false, score: 60, details: 'Ethnicity not submitted (optional field)' };
  }
  
  // Blood Type comparison
  console.log('   Blood Type check: extracted.bloodType=', extracted.bloodType, 'submitted.bloodType=', submitted.bloodType);
  if (extracted.bloodType && submitted.bloodType) {
    const extractedBT = extracted.bloodType.toUpperCase().replace(/\s/g, '');
    const submittedBT = submitted.bloodType.toUpperCase().replace(/\s/g, '');
    if (extractedBT === submittedBT) {
      matches.bloodType = { match: true, score: 100, details: 'Exact match' };
    } else if (extractedBT.charAt(0) === submittedBT.charAt(0)) {
      // Same ABO group, different Rh
      matches.bloodType = { match: true, score: 70, details: `Partial match: same ABO group (${extractedBT} vs ${submittedBT})` };
    } else {
      matches.bloodType = { match: false, score: 0, details: `Mismatch: doc=${extractedBT}, form=${submittedBT}` };
    }
  } else if (!extracted.bloodType || extracted.bloodType === 'null') {
    matches.bloodType = { match: false, score: 50, details: 'Blood type not found in document' };
  } else if (!submitted.bloodType || submitted.bloodType === 'unknown') {
    matches.bloodType = { match: false, score: 50, details: 'Blood type not submitted or unknown' };
  }
  
  // Blood Pressure comparison (within 10% tolerance)
  console.log('   BP check: extracted.systolicBP=', extracted.systolicBP, 'extracted.diastolicBP=', extracted.diastolicBP);
  console.log('   BP submitted: systolicBP=', submitted.systolicBP, 'diastolicBP=', submitted.diastolicBP);
  if (extracted.systolicBP && extracted.diastolicBP && submitted.systolicBP && submitted.diastolicBP) {
    const sysDiff = Math.abs(extracted.systolicBP - parseInt(submitted.systolicBP));
    const diaDiff = Math.abs(extracted.diastolicBP - parseInt(submitted.diastolicBP));
    const sysTolerance = parseInt(submitted.systolicBP) * 0.1;
    const diaTolerance = parseInt(submitted.diastolicBP) * 0.1;
    
    if (sysDiff <= 5 && diaDiff <= 5) {
      matches.bloodPressure = { match: true, score: 100, details: 'Exact match' };
    } else if (sysDiff <= sysTolerance && diaDiff <= diaTolerance) {
      matches.bloodPressure = { match: true, score: 85, details: `Close match: ${extracted.systolicBP}/${extracted.diastolicBP} vs ${submitted.systolicBP}/${submitted.diastolicBP}` };
    } else {
      matches.bloodPressure = { match: false, score: 20, details: `Mismatch: doc=${extracted.systolicBP}/${extracted.diastolicBP}, form=${submitted.systolicBP}/${submitted.diastolicBP}` };
    }
  } else if (!extracted.systolicBP || !extracted.diastolicBP) {
    matches.bloodPressure = { match: false, score: 60, details: 'Blood pressure not found in document' };
  } else {
    matches.bloodPressure = { match: false, score: 60, details: 'Blood pressure not submitted (optional)' };
  }
  
  // BMI comparison (within 1 point tolerance)
  console.log('   BMI check: extracted.bmi=', extracted.bmi, 'submitted.bmi=', submitted.bmi);
  if (extracted.bmi && submitted.bmi) {
    const submittedBMI = parseFloat(submitted.bmi);
    const bmiDiff = Math.abs(extracted.bmi - submittedBMI);
    if (bmiDiff <= 0.5) {
      matches.bmi = { match: true, score: 100, details: 'Exact match' };
    } else if (bmiDiff <= 1) {
      matches.bmi = { match: true, score: 90, details: `Close match: ${extracted.bmi} vs ${submittedBMI}` };
    } else if (bmiDiff <= 2) {
      matches.bmi = { match: true, score: 70, details: `Within tolerance: ${extracted.bmi} vs ${submittedBMI}` };
    } else {
      matches.bmi = { match: false, score: 20, details: `Mismatch: doc=${extracted.bmi}, form=${submittedBMI}` };
    }
  } else if (!extracted.bmi) {
    matches.bmi = { match: false, score: 60, details: 'BMI not found in document' };
  } else {
    matches.bmi = { match: false, score: 60, details: 'BMI not submitted (optional)' };
  }
  
  // Diagnosis comparison (fuzzy match on codes)
  console.log('   Diagnosis check: extracted.diagnosisCodes=', extracted.diagnosisCodes, 'submitted.diagnosis=', submitted.diagnosis);
  if (extracted.diagnosisCodes?.length > 0 && submitted.diagnosis) {
    const submittedCode = parseInt(submitted.diagnosis);
    console.log('   submittedCode (parsed):', submittedCode);
    
    // Map common diagnosis codes to our simplified system
    // ICD-10 E11 (Type 2 diabetes) → our code 350
    // ICD-10 I10 (Hypertension) → our code 700
    const codeMapping = {
      'E11': 350, 'E10': 350, 'E13': 350, // Diabetes
      'I10': 700, 'I11': 700, 'I12': 700, // Hypertension
      'J44': 750, 'J45': 750, // Respiratory
      'C': 200, // Cancer (any C code)
      'F': 500, // Mental health
      'G': 600, // Nervous system
    };
    
    let matched = false;
    for (const diag of extracted.diagnosisCodes) {
      const code = diag.code?.toUpperCase() || '';
      console.log('   Checking code:', code);
      
      // Check direct numeric match
      const numericCode = parseInt(code.replace(/\D/g, ''));
      console.log('   numericCode:', numericCode);
      if (!isNaN(numericCode) && Math.abs(numericCode - submittedCode) < 50) {
        matches.diagnosis = { match: true, score: 95, details: `Code match: ${code}` };
        matched = true;
        break;
      }
      
      // Check ICD mapping
      for (const [icdPrefix, ourCode] of Object.entries(codeMapping)) {
        if (code.startsWith(icdPrefix)) {
          const ourRange = Math.floor(ourCode / 100) * 100;
          const submittedRange = Math.floor(submittedCode / 100) * 100;
          console.log(`   ICD mapping: ${code} starts with ${icdPrefix}, ourCode=${ourCode}, ourRange=${ourRange}, submittedRange=${submittedRange}`);
          if (ourRange === submittedRange) {
            matches.diagnosis = { match: true, score: 85, details: `Category match: ${code} → ${ourCode}` };
            matched = true;
            break;
          }
        }
      }
      if (matched) break;
    }
    
    if (!matched) {
      matches.diagnosis = { 
        match: false, 
        score: 20, 
        details: `No match: doc=${extracted.diagnosisCodes.map(d => d.code).join(', ')}, form=${submittedCode}` 
      };
    }
  } else if (!extracted.diagnosisCodes?.length) {
    matches.diagnosis = { match: false, score: 50, details: 'No diagnosis codes found in document' };
  }
  
  // Biomarker comparison (within 10% tolerance for lab values)
  console.log('   Biomarker check: extracted.biomarkers=', extracted.biomarkers, 'submitted.biomarker=', submitted.biomarker);
  if (extracted.biomarkers?.length > 0 && submitted.biomarker) {
    const submittedValue = parseInt(submitted.biomarker);
    console.log('   submittedValue (parsed):', submittedValue);
    let bestMatch = { match: false, score: 0, details: 'No matching biomarker found' };
    
    for (const bio of extracted.biomarkers) {
      console.log('   Checking biomarker:', bio);
      if (bio.value !== null) {
        const diff = Math.abs(bio.value - submittedValue);
        const tolerance = submittedValue * 0.1; // 10% tolerance
        console.log(`   bio.value=${bio.value}, diff=${diff}, tolerance=${tolerance}`);
        
        if (diff === 0) {
          bestMatch = { match: true, score: 100, details: `Exact match: ${bio.name}=${bio.value}` };
          break;
        } else if (diff <= tolerance) {
          const score = Math.round(100 - (diff / tolerance) * 20);
          if (score > bestMatch.score) {
            bestMatch = { match: true, score, details: `Close match: ${bio.name}=${bio.value} (submitted: ${submittedValue})` };
          }
        }
      }
    }
    matches.biomarker = bestMatch;
  } else if (!extracted.biomarkers?.length) {
    matches.biomarker = { match: false, score: 50, details: 'No biomarkers found in document' };
  }
  
  // Outcome is subjective - give partial credit if document mentions treatment
  if (extracted.treatmentOutcome !== null && submitted.outcome) {
    const diff = Math.abs(extracted.treatmentOutcome - parseInt(submitted.outcome));
    if (diff <= 10) {
      matches.outcome = { match: true, score: 80, details: 'Treatment outcome aligns with document' };
    } else if (diff <= 25) {
      matches.outcome = { match: true, score: 60, details: 'Treatment outcome partially aligns' };
    } else {
      matches.outcome = { match: false, score: 30, details: 'Treatment outcome differs significantly' };
    }
  } else {
    // Outcome often not in documents - don't penalize heavily
    matches.outcome = { match: false, score: 60, details: 'Treatment outcome not verifiable from document' };
  }
  
  return matches;
}

/**
 * Calculate overall confidence score
 */
function calculateConfidenceScore(extracted, matches) {
  // Weighted scoring - adjusted for expanded fields
  // Core fields get higher weights, optional fields get lower weights
  const weights = {
    // Required fields (higher weight)
    age: 12,
    gender: 8,
    bloodType: 8,
    diagnosis: 18,
    biomarker: 12,
    
    // Optional fields (lower weight - shouldn't penalize heavily if missing)
    ethnicity: 4,
    bloodPressure: 5,
    bmi: 5,
    outcome: 3,
    
    // Document quality (important for forgery detection)
    authenticity: 15,
    extraction: 10
  };
  
  let totalScore = 0;
  let totalWeight = 0;
  
  // Field match scores
  for (const [field, weight] of Object.entries(weights)) {
    if (field === 'authenticity') {
      totalScore += (extracted.authenticityScore || 0) * weight / 100;
      totalWeight += weight;
    } else if (field === 'extraction') {
      totalScore += (extracted.extractionConfidence || 0) * weight / 100;
      totalWeight += weight;
    } else if (matches[field]) {
      totalScore += matches[field].score * weight / 100;
      totalWeight += weight;
    }
  }
  
  return Math.round((totalScore / totalWeight) * 100);
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    
    // Get document file
    const file = formData.get('document');
    if (!file) {
      return NextResponse.json(
        { error: 'No document provided' },
        { status: 400 }
      );
    }
    
    // Validate file type
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Supported: JPEG, PNG, WebP, PDF` },
        { status: 400 }
      );
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }
    
    // Get submitted form data for comparison (including new expanded fields)
    const submittedData = {
      age: formData.get('age'),
      gender: formData.get('gender'),
      ethnicity: formData.get('ethnicity'),
      bloodType: formData.get('bloodType'),
      systolicBP: formData.get('systolicBP'),
      diastolicBP: formData.get('diastolicBP'),
      bmi: formData.get('bmi'),
      diagnosis: formData.get('diagnosis'),
      outcome: formData.get('outcome'),
      biomarker: formData.get('biomarker')
    };
    
    console.log('📝 Received form data for comparison:', submittedData);
    
    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    
    // Calculate document hash
    const documentHash = '0x' + createHash('sha256').update(buffer).digest('hex');
    
    console.log('📄 Processing document verification...');
    console.log('   Type:', file.type);
    console.log('   Size:', Math.round(file.size / 1024), 'KB');
    console.log('   Hash:', documentHash.slice(0, 20) + '...');
    
    // Extract medical data using AI
    let extracted;
    try {
      extracted = await extractMedicalData(base64, file.type);
      console.log('🤖 AI extraction complete:', {
        age: extracted.patientAge,
        gender: extracted.patientGender,
        bloodType: extracted.bloodType,
        diagnosisCodes: extracted.diagnosisCodes?.length || 0,
        biomarkers: extracted.biomarkers?.length || 0,
        authenticity: extracted.authenticityScore
      });
    } catch (err) {
      console.error('AI extraction failed:', err);
      return NextResponse.json(
        { error: `AI extraction failed: ${err.message}` },
        { status: 500 }
      );
    }
    
    // Compare extracted data with submitted data
    const matches = compareData(extracted, submittedData);
    console.log('📊 Data comparison:', matches);
    
    // Calculate overall confidence score
    const confidenceScore = calculateConfidenceScore(extracted, matches);
    console.log('✅ Final confidence score:', confidenceScore);
    
    // Determine verification result
    const passed = confidenceScore >= 70;
    
    // Build extraction summary for on-chain storage (keep it brief)
    const summary = [
      `Type: ${extracted.documentType}`,
      `Provider: ${extracted.providerName || 'Unknown'}`,
      `Date: ${extracted.documentDate || 'Unknown'}`,
      `Age: ${matches.age.match ? '✓' : '✗'} ${matches.age.details}`,
      `Gender: ${matches.gender.match ? '✓' : '✗'} ${matches.gender.details}`,
      `Ethnicity: ${matches.ethnicity.match ? '✓' : '✗'} ${matches.ethnicity.details}`,
      `Blood: ${matches.bloodType.match ? '✓' : '✗'} ${matches.bloodType.details}`,
      `BP: ${matches.bloodPressure.match ? '✓' : '✗'} ${matches.bloodPressure.details}`,
      `BMI: ${matches.bmi.match ? '✓' : '✗'} ${matches.bmi.details}`,
      `Diagnosis: ${matches.diagnosis.match ? '✓' : '✗'} ${matches.diagnosis.details}`,
      `Biomarker: ${matches.biomarker.match ? '✓' : '✗'} ${matches.biomarker.details}`
    ].join(' | ');
    
    return NextResponse.json({
      success: true,
      documentHash,
      confidenceScore,
      passed,
      extracted: {
        patientAge: extracted.patientAge,
        patientGender: extracted.patientGender,
        patientEthnicity: extracted.patientEthnicity,
        bloodType: extracted.bloodType,
        systolicBP: extracted.systolicBP,
        diastolicBP: extracted.diastolicBP,
        bmi: extracted.bmi,
        diagnosisCodes: extracted.diagnosisCodes,
        biomarkers: extracted.biomarkers,
        documentType: extracted.documentType,
        providerName: extracted.providerName,
        documentDate: extracted.documentDate,
        hasSignature: extracted.hasSignature,
        authenticityScore: extracted.authenticityScore,
        authenticityNotes: extracted.authenticityNotes
      },
      matches,
      summary
    });
    
  } catch (err) {
    console.error('Verification error:', err);
    return NextResponse.json(
      { error: err.message || 'Verification failed' },
      { status: 500 }
    );
  }
}
