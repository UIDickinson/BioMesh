# Sample Test Documents for BioMesh Verification

These sample documents are for testing the AI document verification feature.

## Available Test Documents

### 1. Sample Lab Report (`sample-lab-report.html`)

This is a realistic-looking lab report with the following data:

| Field | Value | Form Input |
|-------|-------|------------|
| Patient Age | 45 years | `45` |
| Gender | Male | `male` |
| Blood Type | O+ | `O+` |
| Diagnosis Code | E11.9 (Type 2 Diabetes) | `350` |
| Fasting Glucose (Biomarker) | 126 mg/dL | `126` |
| Treatment Outcome | 75/100 | `75` |

### How to Use for Testing

1. **Open the HTML file in a browser:**
   ```
   file:///path/to/frontend/public/test-documents/sample-lab-report.html
   ```
   Or access via: `http://localhost:3000/test-documents/sample-lab-report.html`

2. **Take a screenshot or print to PDF:**
   - In Chrome: Right-click → Print → Save as PDF
   - Or use screenshot tool to capture as PNG/JPEG

3. **Fill in the Patient Form with these values (Required Fields):**
   - Age: `45`
   - Gender: `Male`
   - Blood Type: `O+`
   - Diagnosis Code: `350` (Diabetes/Endocrine)
   - Biomarker: `126`

4. **Optional Fields:**
   - Treatment Outcome: `75`

5. **Enable Verification:**
   - Toggle "Enable Data Verification" ON
   - Set stake amount (0.01 ETH recommended)
   - Upload the screenshot/PDF of the lab report
   - Select "Lab Report" as document type

6. **Expected AI Verification Result:**
   - Confidence Score: 80-95% (should pass verification)
   - Age Match: ✓ (document shows DOB → age 45)
   - Gender Match: ✓ (document shows Male)
   - Blood Type Match: ✓ (document shows O+)
   - Diagnosis Match: ✓ (E11.9 maps to category 350)
   - Biomarker Match: ✓ (Glucose = 126)
   - Outcome Match: ✓ (Treatment score = 75)

## Creating Test Scenarios

### Scenario A: Perfect Match (High Confidence)
- Use exact values from document
- Expected: 85-95% confidence, PASS

### Scenario B: Partial Match
- Change biomarker to `130` instead of `126`
- Expected: 70-80% confidence, borderline PASS

### Scenario C: Mismatch (Should Fail)
- Use age: `55` (document shows 45)
- Use diagnosis: `700` (document shows diabetes, not cardiovascular)
- Expected: 30-50% confidence, FAIL

## Notes

- The "SAMPLE" watermark indicates this is a test document
- In production, patients would upload real medical documents
- The AI compares extracted data with submitted form values
- Higher confidence = more trust in data authenticity
