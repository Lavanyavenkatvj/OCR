/* =============================================
   app.js — Scheme Sathi OCR Logic
   Extracts Name, DOB, Gender, Aadhaar, Address
   from Indian ID cards using Tesseract.js
   ============================================= */


// ─────────────────────────────────────────────
// PART 1: FIELD PATTERNS
// These are search rules (RegEx) that find
// specific text like name, DOB, address etc.
// from the raw OCR text
// ─────────────────────────────────────────────

const PATTERNS = {

  // NAME: looks for "Name:" followed by text
  // Also looks for lines that are ALL CAPS (like on Aadhaar)
  name: [
    /(?:name|नाम|பெயர்|పేరు)[:\s]+([A-Za-z][A-Za-z\s]{2,30})/i,
    /^([A-Z][A-Z\s]{3,30})$/m,
  ],

  // DATE OF BIRTH: looks for "DOB:" or "Date of Birth:" then a date
  dob: [
    /(?:dob|date of birth|जन्म तिथि|பிறந்த தேதி|జన్మ తేదీ)[:\s]+(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
    /(?:year of birth|YOB)[:\s]*(\d{4})/i,
    /(\d{2}[\/\-]\d{2}[\/\-]\d{4})/,
  ],

  // GENDER: looks for the word male/female in any Indian language
  gender: [
    /\b(male|female|MALE|FEMALE)\b/,
    /\b(पुरुष|महिला|ஆண்|பெண்|స్త్రీ|పురుషుడు)\b/i,
  ],

  // AADHAAR NUMBER: 12-digit number, often in groups of 4
  aadhaar: [
    /(\d{4}\s\d{4}\s\d{4})/,    // format: 1234 5678 9012
    /(\d{12})/,                   // format: 123456789012
  ],

  // PINCODE: exactly 6 digits
  pincode: [
    /\b(\d{6})\b/,
  ],

  // ADDRESS: looks for "Address:" followed by text
  address: [
    /(?:address|पता|முகவரி|చిరునామా)[:\s]*(.{20,150})/i,
  ],

  // VOTER ID: 3 letters + 7 digits (e.g. ABC1234567)
  voter_id: [
    /\b([A-Z]{3}\d{7})\b/,
  ],
};


// ─────────────────────────────────────────────
// ─────────────────────────────────────────────

// Removes extra spaces and trims the text
function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function extractField(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // match[1] = first group inside (), match[0] = full match
      return cleanText(match[1] || match[0]);
    }
  }
  return null; // not found
}

function detectStateFromPincode(pincode) {
  const pin = parseInt(pincode.replace(/\s/g, ''));
  const prefix = Math.floor(pin / 10000);

  const stateMap = {
    11: 'Delhi',
    12: 'Haryana', 13: 'Haryana',
    14: 'Punjab', 15: 'Punjab', 16: 'Punjab',
    17: 'Himachal Pradesh',
    18: 'Jammu & Kashmir', 19: 'Jammu & Kashmir',
    20: 'Uttar Pradesh', 21: 'Uttar Pradesh', 22: 'Uttar Pradesh',
    23: 'Uttar Pradesh', 24: 'Uttar Pradesh', 25: 'Uttar Pradesh',
    26: 'Uttar Pradesh', 27: 'Uttar Pradesh', 28: 'Uttar Pradesh',
    30: 'Rajasthan', 31: 'Rajasthan', 32: 'Rajasthan',
    33: 'Rajasthan', 34: 'Rajasthan',
    36: 'Gujarat', 37: 'Gujarat', 38: 'Gujarat', 39: 'Gujarat',
    40: 'Maharashtra', 41: 'Maharashtra', 42: 'Maharashtra',
    43: 'Maharashtra', 44: 'Maharashtra',
    45: 'Madhya Pradesh', 46: 'Madhya Pradesh',
    47: 'Madhya Pradesh', 48: 'Madhya Pradesh',
    49: 'Chhattisgarh',
    50: 'Andhra Pradesh', 51: 'Andhra Pradesh',
    52: 'Andhra Pradesh', 53: 'Andhra Pradesh',
    56: 'Karnataka', 57: 'Karnataka', 58: 'Karnataka', 59: 'Karnataka',
    60: 'Tamil Nadu', 61: 'Tamil Nadu', 62: 'Tamil Nadu',
    63: 'Tamil Nadu', 64: 'Tamil Nadu',
    67: 'Kerala', 68: 'Kerala', 69: 'Kerala',
    70: 'West Bengal', 71: 'West Bengal', 72: 'West Bengal',
    73: 'West Bengal', 74: 'West Bengal',
    75: 'Odisha', 76: 'Odisha', 77: 'Odisha',
    78: 'Assam', 79: 'Assam',
    80: 'Bihar', 81: 'Bihar', 82: 'Bihar', 84: 'Bihar',
    83: 'Jharkhand',
  };

  return stateMap[prefix] || 'India';
}



let currentFile = null;      // stores the image File object (RAM)
let currentDocType = 'aadhaar'; // which ID type is selected
let extractedFields = {};    // stores the extracted data object (RAM)



const fileInput  = document.getElementById('fileInput');
const dropZone   = document.getElementById('dropZone');
const previewRow = document.getElementById('previewRow');
const imgPreview = document.getElementById('imgPreview');
const extractBtn = document.getElementById('extractBtn');

fileInput.addEventListener('change', function(e) {
  handleFile(e.target.files[0]);
});

dropZone.addEventListener('dragover', function(e) {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', function() {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', function(e) {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    handleFile(file);
  } else {
    alert('Please drop an image file (JPG, PNG, etc.)');
  }
});

dropZone.addEventListener('click', function() {
  fileInput.click();
});

function setDocType(value) {
  currentDocType = value;
}

// Handle the selected image file
function handleFile(file) {
  if (!file) return;

  // Save file to variable (stored in browser RAM)
  currentFile = file;

  // Create a preview URL (temporary, only in memory)
  const previewURL = URL.createObjectURL(file);
  imgPreview.src = previewURL;

  // Show file name and size
  document.getElementById('previewName').textContent = file.name;
  document.getElementById('previewSize').textContent =
    (file.size / 1024).toFixed(1) + ' KB';

  // Show the preview row
  previewRow.style.display = 'flex';

  // Hide old results
  document.getElementById('progressCard').style.display   = 'none';
  document.getElementById('extractedCard').style.display  = 'none';
  document.getElementById('formCard').style.display       = 'none';
  document.getElementById('successCard').style.display    = 'none';
}


// ─────────────────────────────────────────────
// PART 5: MAIN OCR FUNCTION
// This runs when user clicks "Extract Data"
// ─────────────────────────────────────────────

async function runOCR() {
  if (!currentFile) {
    alert('Please upload an ID image first!');
    return;
  }

  // Disable button to prevent double-click
  extractBtn.disabled = true;
  extractBtn.textContent = '⏳ Processing...';

  // Show progress section
  const progressCard = document.getElementById('progressCard');
  progressCard.style.display = 'block';
  progressCard.scrollIntoView({ behavior: 'smooth' });

  // Reset progress bar
  setProgress(0, 'Starting Tesseract.js OCR engine...');
  setStep(1, 'active');

  try {

    // STEP 1: Create Tesseract Worker
    // This is the OCR engine — runs in a background thread (Web Worker)
    // STORAGE: Engine code is cached in browser cache
    setStep(1, 'active');
    const worker = await Tesseract.createWorker(
      'eng+hin+tam+tel',  // English + Hindi + Tamil + Telugu
      1,
      {
        // This function is called many times as OCR runs
        // It gives us live progress updates
        logger: function(info) {
          if (info.status === 'recognizing text') {
            const pct = Math.round(info.progress * 100);
            setProgress(pct, 'Recognizing text... ' + pct + '%');

            // Update steps based on progress
            if (pct > 10)  { setStep(1, 'done'); setStep(2, 'active'); }
            if (pct > 30)  { setStep(2, 'done'); setStep(3, 'active'); }
            if (pct > 60)  { setStep(3, 'done'); setStep(4, 'active'); }
            if (pct > 85)  { setStep(4, 'done'); setStep(5, 'active'); }
          } else {
            setProgress(5, info.status + '...');
          }
        }
      }
    );

    // STEP 2: Run OCR on the image
    // Tesseract reads every pixel and detects characters
    // STORAGE: Image stays in RAM. Text result stored in 'result' variable
    setStep(2, 'active');
    const result = await worker.recognize(currentFile);

    // STEP 3: Get the raw text string
    // result.data.text = all text found in the image as a plain string
    // STORAGE: Stored in JS variable 'rawText' — browser RAM only
    const rawText = result.data.text;
    const confidence = Math.round(result.data.confidence);

    // Show raw OCR text in the UI
    document.getElementById('rawText').textContent = rawText;

    // STEP 4: Extract specific fields using PATTERNS
    // Each pattern searches for name/dob/etc in rawText
    // STORAGE: Results stored in 'extractedFields' JS object — RAM
    setStep(4, 'active');

    extractedFields = {
      name:     extractField(rawText, PATTERNS.name),
      dob:      extractField(rawText, PATTERNS.dob),
      gender:   extractField(rawText, PATTERNS.gender),
      aadhaar:  extractField(rawText, PATTERNS.aadhaar),
      address:  extractField(rawText, PATTERNS.address),
      pincode:  extractField(rawText, PATTERNS.pincode),
      voter_id: extractField(rawText, PATTERNS.voter_id),
    };

    // Auto-detect state from pincode if we found one
    if (extractedFields.pincode) {
      extractedFields.state = detectStateFromPincode(extractedFields.pincode);
    }

    // STEP 5: Auto-fill the form
    setStep(5, 'active');
    setProgress(100, '✅ Done! Data extracted successfully.');

    // Clean up the worker — frees RAM used by OCR engine
    await worker.terminate();

    // Mark all steps done
    for (let i = 1; i <= 5; i++) setStep(i, 'done');

    // Show extracted data section
    showExtractedData(extractedFields, confidence, rawText);

    // Auto-fill the form with extracted data
    autoFillForm(extractedFields);

    // Show the form section
    document.getElementById('extractedCard').style.display = 'block';
    document.getElementById('formCard').style.display      = 'block';
    document.getElementById('formCard').scrollIntoView({ behavior: 'smooth' });

  } catch (error) {
    // If OCR fails, show the error
    setProgress(0, '❌ Error: ' + error.message);
    console.error('OCR Error:', error);
  }

  // Re-enable the button
  extractBtn.disabled = false;
  extractBtn.textContent = '🔍 Extract Data from ID';
}


// ─────────────────────────────────────────────
// PART 6: SHOW EXTRACTED DATA CARDS
// ─────────────────────────────────────────────

function showExtractedData(fields, confidence, rawText) {
  const grid = document.getElementById('extractedGrid');
  grid.innerHTML = ''; // clear old results

  // Field display labels
  const labels = {
    name:     '👤 Name',
    dob:      '🎂 Date of Birth',
    gender:   '⚧ Gender',
    aadhaar:  '🔢 Aadhaar Number',
    address:  '🏠 Address',
    pincode:  '📮 Pincode',
    state:    '🗺️ State',
    voter_id: '🗳️ Voter ID',
  };

  // Create a card for each field
  for (const [key, label] of Object.entries(labels)) {
    const value = fields[key];
    const card = document.createElement('div');
    card.className = 'extracted-field';
    card.innerHTML = `
      <div class="field-label">${label}</div>
      ${value
        ? `<div class="field-value">${value}</div>`
        : `<div class="field-not-found">Not detected</div>`
      }
    `;
    // Make address card full-width
    if (key === 'address') card.style.gridColumn = '1 / -1';
    grid.appendChild(card);
  }

  // Show confidence badge
  const badge = document.getElementById('confidenceBadge');
  badge.textContent = `OCR Confidence: ${confidence}%`;
  if (confidence > 70) badge.className = 'confidence-badge conf-high';
  else if (confidence > 40) badge.className = 'confidence-badge conf-med';
  else badge.className = 'confidence-badge conf-low';

  // Store raw text for toggle button
  document.getElementById('rawText').textContent = rawText;
}


// ─────────────────────────────────────────────
// PART 7: AUTO-FILL THE FORM
// Takes extracted fields and puts them into
// the HTML form input boxes
// ─────────────────────────────────────────────

function autoFillForm(fields) {

  // Helper to fill a field and show "Auto-filled" label
  function fill(inputId, sourceId, value) {
    const input = document.getElementById(inputId);
    const source = document.getElementById(sourceId);
    if (value && input) {
      input.value = value;
      input.style.borderColor = '#138808'; // green border = auto-filled
      if (source) source.textContent = '✅ Auto-filled from ID';
    }
  }

  // Fill each form field from extracted data
  fill('formName',    'srcName',    fields.name);
  fill('formDob',     'srcDob',     fields.dob);
  fill('formAadhaar', 'srcAadhaar', fields.aadhaar);
  fill('formAddress', 'srcAddress', fields.address);
  fill('formPincode', 'srcPincode', fields.pincode);
  fill('formState',   'srcState',   fields.state);
  fill('formVoterId', 'srcVoterId', fields.voter_id);

  // Gender is a dropdown — match the value
  if (fields.gender) {
    const genderSelect = document.getElementById('formGender');
    const g = fields.gender.toLowerCase();
    if (g.includes('female') || g.includes('महिला') || g.includes('பெண்')) {
      genderSelect.value = 'Female';
    } else if (g.includes('male') || g.includes('पुरुष') || g.includes('ஆண்')) {
      genderSelect.value = 'Male';
    }
    document.getElementById('srcGender').textContent = '✅ Auto-filled from ID';
    genderSelect.style.borderColor = '#138808';
  }
}


// ─────────────────────────────────────────────
// PART 8: FORM SUBMIT
// ─────────────────────────────────────────────

function submitForm() {
  // Collect all form values into a JS object
  // STORAGE: This object is in browser RAM
  const submission = {
    name:     document.getElementById('formName').value,
    dob:      document.getElementById('formDob').value,
    gender:   document.getElementById('formGender').value,
    aadhaar:  document.getElementById('formAadhaar').value,
    address:  document.getElementById('formAddress').value,
    pincode:  document.getElementById('formPincode').value,
    state:    document.getElementById('formState').value,
    voter_id: document.getElementById('formVoterId').value,
    mobile:   document.getElementById('formMobile').value,
    doc_type: currentDocType,
    submitted_at: new Date().toLocaleString('en-IN'),
  };

  // Validate: name is required
  if (!submission.name) {
    alert('Please enter the applicant name before submitting.');
    return;
  }

  // Build a readable summary for the success card
  const summary = Object.entries(submission)
    .filter(([_, v]) => v) // only show filled fields
    .map(([k, v]) => `${k.toUpperCase().replace(/_/g, ' ')}: ${v}`)
    .join('\n');

  document.getElementById('successData').textContent = summary;

  // Show success card
  document.getElementById('formCard').style.display = 'none';
  const successCard = document.getElementById('successCard');
  successCard.style.display = 'block';
  successCard.scrollIntoView({ behavior: 'smooth' });

  // Log to console (like the original requirement: "Printed in Console")
  console.log('=== Scheme Sathi — Submitted Application ===');
  console.log(submission);
}


// ─────────────────────────────────────────────
// PART 9: DOWNLOAD JSON
// This is the ONLY step that saves data to disk
// ─────────────────────────────────────────────

function downloadJSON() {
  // Collect form data
  const data = {
    applicant: {
      name:     document.getElementById('formName').value,
      dob:      document.getElementById('formDob').value,
      gender:   document.getElementById('formGender').value,
      aadhaar:  document.getElementById('formAadhaar').value,
      address:  document.getElementById('formAddress').value,
      pincode:  document.getElementById('formPincode').value,
      state:    document.getElementById('formState').value,
      voter_id: document.getElementById('formVoterId').value,
      mobile:   document.getElementById('formMobile').value,
    },
    document_type: currentDocType,
    extracted_at: new Date().toISOString(),
    source: 'Scheme Sathi OCR — Aadhaar Auto-Fill Module',
  };

  // Convert JS object to JSON string
  const jsonString = JSON.stringify(data, null, 2);

  // Create a Blob (a temporary in-memory file)
  // STORAGE: momentarily in RAM as a Blob
  const blob = new Blob([jsonString], { type: 'application/json' });

  // Create a download link and click it
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'scheme-sathi-applicant.json';
  link.click();

  // Free the blob URL from memory
  URL.revokeObjectURL(link.href);

  // NOTE: After this download, the file is on your DEVICE (hard disk)
  // That is the only time data leaves browser RAM
}


// ─────────────────────────────────────────────
// PART 10: UI HELPER FUNCTIONS
// ─────────────────────────────────────────────

// Update the progress bar and label
function setProgress(percent, label) {
  document.getElementById('progressFill').style.width = percent + '%';
  document.getElementById('progressLabel').textContent = label;
}

// Mark an OCR step as active (running) or done (completed)
function setStep(number, state) {
  const el = document.getElementById('ocrStep' + number);
  if (!el) return;
  el.classList.remove('active', 'done');
  if (state === 'active') {
    el.classList.add('active');
    // Change icon to running
    el.textContent = el.textContent.replace('⏳', '⚙️');
  }
  if (state === 'done') {
    el.classList.add('done');
    // Change icon to checkmark
    el.textContent = el.textContent.replace('⚙️', '✅').replace('⏳', '✅');
  }
}

// Toggle raw OCR text visibility
function toggleRaw() {
  const raw = document.getElementById('rawText');
  raw.style.display = raw.style.display === 'none' ? 'block' : 'none';
}

// Reset everything back to initial state
function resetAll() {
  currentFile = null;
  extractedFields = {};

  fileInput.value = '';
  imgPreview.src = '';

  document.getElementById('previewRow').style.display      = 'none';
  document.getElementById('progressCard').style.display    = 'none';
  document.getElementById('extractedCard').style.display   = 'none';
  document.getElementById('formCard').style.display        = 'none';
  document.getElementById('successCard').style.display     = 'none';

  extractBtn.disabled = true;
  extractBtn.textContent = '🔍 Extract Data from ID';

  // Reset form fields
  ['formName','formDob','formAadhaar','formAddress',
   'formPincode','formState','formVoterId','formMobile'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.style.borderColor = ''; }
  });
  document.getElementById('formGender').value = '';

  // Reset step labels
  const stepTexts = [
    '⏳ Loading OCR engine (Tesseract.js)',
    '⏳ Reading image pixels',
    '⏳ Recognizing text in English + Hindi + Tamil + Telugu',
    '⏳ Extracting Name, DOB, Address, Aadhaar fields',
    '⏳ Auto-filling form',
  ];
  stepTexts.forEach((text, i) => {
    const el = document.getElementById('ocrStep' + (i + 1));
    if (el) { el.textContent = text; el.className = 'ocr-step'; }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}
