/**
 * Document Classifier Engine v2
 * Enhanced with fuzzy matching, filename-based detection, and OCR noise tolerance.
 * Categorizes Indian documents for loan processing.
 */

const DOCUMENT_TYPES = {
  AADHAAR: {
    id: 'aadhaar',
    label: 'Aadhaar Card',
    category: 'identity',
    icon: 'IdCard',
    color: '#f97316',
    keywords: [
      'aadhaar', 'aadhar', 'adhar', 'aadhaar', 'aadhar', 'adhaar',
      'uid', 'unique identification', 'uidai',
      'government of india', 'govt of india', 'enrolment', 'enrollment',
      'male', 'female', 'date of birth', 'dob', 'vid', 'virtual id',
      'mera aadhaar', 'meri pehchaan',
    ],
    // Fuzzy variants to catch OCR errors (common Tesseract misreads)
    fuzzyKeywords: [
      'aadh', 'aadha', 'uidai', 'aadb', 'aadbaar', 'aadnaar',
      'uidal', 'aadhi', 'unique ident', 'govern', 'india',
      'enrol', 'identif', 'pehch',
    ],
    patterns: [
      /\d{4}\s?\d{4}\s?\d{4}/,                // 12-digit Aadhaar number (relaxed)
      /\d{4}[\s._-]?\d{4}[\s._-]?\d{4}/,      // with various separators
      /unique\s*ident/i,
      /uid[a-z]?i/i,
      /a{1,2}dh?[ao]{1,2}r/i,                 // fuzzy aadhaar
      /meri?\s*pehch/i,
    ],
    filenameHints: ['aadhaar', 'aadhar', 'adhar', 'aadhar', 'uid', 'uidai'],
    weight: 1.0,
    requiredForLoan: true,
  },

  PAN: {
    id: 'pan',
    label: 'PAN Card',
    category: 'identity',
    icon: 'CreditCard',
    color: '#3b82f6',
    keywords: [
      'permanent account number', 'pan', 'income tax',
      'income tax department', 'govt of india', 'it dept',
      'father', 'signature', 'permanent',
    ],
    fuzzyKeywords: [
      'perman', 'account num', 'income', 'tax dept', 'incometax',
    ],
    patterns: [
      /[A-Z]{5}\d{4}[A-Z]/,                    // PAN format
      /[A-Z]{3}[A-Z]{2}\d{4}[A-Z]/,            // slightly relaxed PAN
      /permanent\s*account/i,
      /income\s*tax/i,
    ],
    filenameHints: ['pan', 'pan_card', 'pancard', 'pan-card'],
    weight: 1.0,
    requiredForLoan: true,
  },

  VOTER_ID: {
    id: 'voter_id',
    label: 'Voter ID Card',
    category: 'identity',
    icon: 'Vote',
    color: '#8b5cf6',
    keywords: [
      'election commission', 'voter', 'electoral', 'epic',
      'electors photo identity', 'elector', 'polling station',
      'constituency', 'assembly',
    ],
    fuzzyKeywords: ['elect', 'voter', 'commiss', 'polling', 'constit'],
    patterns: [
      /[A-Z]{3}\d{7}/,
      /election\s*comm/i,
      /elect[oi]r/i,
      /epic/i,
    ],
    filenameHints: ['voter', 'voterid', 'voter_id', 'epic', 'election'],
    weight: 0.9,
    requiredForLoan: false,
  },

  PASSPORT: {
    id: 'passport',
    label: 'Passport',
    category: 'identity',
    icon: 'Globe',
    color: '#0ea5e9',
    keywords: [
      'passport', 'republic of india', 'nationality', 'indian',
      'place of birth', 'date of issue', 'date of expiry',
      'emigration', 'country code', 'given name', 'surname',
    ],
    fuzzyKeywords: ['passp', 'republic', 'nationality', 'emigr', 'surname'],
    patterns: [
      /[A-Z]\d{7}/,
      /republic\s*of\s*ind/i,
      /passp[o0]rt/i,
      /date\s*of\s*expiry/i,
    ],
    filenameHints: ['passport'],
    weight: 0.9,
    requiredForLoan: false,
  },

  DRIVING_LICENSE: {
    id: 'driving_license',
    label: 'Driving License',
    category: 'identity',
    icon: 'Car',
    color: '#14b8a6',
    keywords: [
      'driving', 'licence', 'license', 'transport',
      'motor vehicle', 'rto', 'validity', 'class of vehicle',
      'non-transport', 'authorization',
    ],
    fuzzyKeywords: ['driv', 'licen', 'transp', 'motor', 'vehicle', 'rto'],
    patterns: [
      /[A-Z]{2}\d{2}\s?\d{11}/,
      /driv[i1]ng\s*l[i1]cen/i,
      /class\s*of\s*veh/i,
      /motor\s*veh/i,
    ],
    filenameHints: ['driving', 'license', 'licence', 'dl', 'driving_license'],
    weight: 0.8,
    requiredForLoan: false,
  },

  BANK_STATEMENT: {
    id: 'bank_statement',
    label: 'Bank Statement',
    category: 'financial',
    icon: 'Landmark',
    color: '#22c55e',
    keywords: [
      'bank', 'statement', 'account', 'balance', 'transaction',
      'credit', 'debit', 'ifsc', 'branch', 'savings', 'current',
      'opening balance', 'closing balance', 'cheque', 'neft', 'rtgs',
      'upi', 'imps', 'withdrawal', 'deposit', 'interest',
    ],
    fuzzyKeywords: ['balanc', 'transact', 'statemen', 'savi', 'depo', 'withdr'],
    patterns: [
      /\d{9,18}/,
      /[A-Z]{4}0[A-Z0-9]{6}/,
      /open[i1]ng\s*bal/i,
      /clos[i1]ng\s*bal/i,
      /statement\s*of\s*acc/i,
      /account\s*stat/i,
    ],
    filenameHints: ['bank', 'statement', 'bank_statement', 'bankstatement'],
    weight: 1.0,
    requiredForLoan: true,
  },

  SALARY_SLIP: {
    id: 'salary_slip',
    label: 'Salary Slip',
    category: 'financial',
    icon: 'Receipt',
    color: '#eab308',
    keywords: [
      'salary', 'slip', 'payslip', 'pay slip', 'earnings',
      'deductions', 'basic', 'hra', 'da', 'pf', 'provident fund',
      'gross', 'net pay', 'take home', 'employer', 'employee',
      'epf', 'esi', 'professional tax', 'tds',
    ],
    fuzzyKeywords: ['salar', 'paysl', 'earnin', 'deduct', 'provid', 'gross'],
    patterns: [
      /salary\s*s[l1]ip/i,
      /pay\s*s[l1]ip/i,
      /gross\s*(sa[l1]ary|pay|earn)/i,
      /net\s*(sa[l1]ary|pay)/i,
      /bas[i1]c\s*(sa[l1]ary|pay)/i,
      /house\s*rent|hra/i,
    ],
    filenameHints: ['salary', 'payslip', 'salary_slip', 'salaryslip'],
    weight: 1.0,
    requiredForLoan: true,
  },

  ITR: {
    id: 'itr',
    label: 'Income Tax Return',
    category: 'financial',
    icon: 'FileText',
    color: '#ef4444',
    keywords: [
      'income tax return', 'itr', 'assessment year', 'financial year',
      'total income', 'tax payable', 'refund', 'form 16',
      'acknowledgement', 'e-filing', 'gross total income',
      'deductions', 'section 80c', 'chapter vi',
    ],
    fuzzyKeywords: ['income tax', 'assess', 'refund', 'e-fil', 'acknowled'],
    patterns: [
      /income\s*tax\s*ret/i,
      /itr[\s\-_]?\d/i,
      /assessment\s*y/i,
      /form\s*(?:no\.?\s*)?16/i,
      /e[\s\-]*fil[i1]ng/i,
      /acknowledg/i,
    ],
    filenameHints: ['itr', 'incometax', 'income_tax', 'form16', 'tax_return'],
    weight: 1.0,
    requiredForLoan: true,
  },

  UTILITY_BILL: {
    id: 'utility_bill',
    label: 'Utility Bill',
    category: 'address_proof',
    icon: 'Zap',
    color: '#a855f7',
    keywords: [
      'electricity', 'bill', 'water', 'gas', 'telephone',
      'broadband', 'consumer', 'meter', 'units', 'due date',
      'billing period', 'connection', 'supply', 'tariff',
      'sanctioned load', 'reading',
    ],
    fuzzyKeywords: ['electr', 'consum', 'meter', 'billin', 'tarif'],
    patterns: [
      /electr[i1]c[i1]ty/i,
      /consumer\s*(no|num|id)/i,
      /b[i1]ll[i1]ng\s*per[i1]od/i,
      /meter\s*(no|num|read)/i,
      /due\s*date/i,
      /amount\s*(due|payab)/i,
    ],
    filenameHints: ['electricity', 'utility', 'bill', 'water_bill', 'gas_bill'],
    weight: 0.8,
    requiredForLoan: false,
  },

  PROPERTY_DOC: {
    id: 'property_doc',
    label: 'Property Document',
    category: 'property',
    icon: 'Home',
    color: '#f43f5e',
    keywords: [
      'property', 'deed', 'registration', 'sale', 'agreement',
      'land', 'plot', 'flat', 'house', 'apartment', 'builder',
      'possession', 'stamp duty', 'sub-registrar', 'encumbrance',
      'mutation', 'khata', 'patta', 'survey number',
    ],
    fuzzyKeywords: ['propert', 'registr', 'possess', 'stamp', 'encumb', 'mutat'],
    patterns: [
      /sale\s*deed/i,
      /registr[a-z]*\s*(no|num)/i,
      /sub[\s\-]*registr/i,
      /stamp\s*duty/i,
      /encumbr/i,
      /survey\s*(no|num)/i,
    ],
    filenameHints: ['property', 'deed', 'sale_deed', 'registration', 'land'],
    weight: 0.9,
    requiredForLoan: false,
  },

  PHOTOGRAPH: {
    id: 'photograph',
    label: 'Passport Photograph',
    category: 'other',
    icon: 'Camera',
    color: '#64748b',
    keywords: [],
    fuzzyKeywords: [],
    patterns: [],
    filenameHints: ['photo', 'photograph', 'passport_photo'],
    weight: 0.5,
    requiredForLoan: true,
  },

  UNKNOWN: {
    id: 'unknown',
    label: 'Unknown Document',
    category: 'other',
    icon: 'HelpCircle',
    color: '#94a3b8',
    keywords: [],
    fuzzyKeywords: [],
    patterns: [],
    filenameHints: [],
    weight: 0,
    requiredForLoan: false,
  }
};

/**
 * Clean OCR text — normalize common Tesseract errors
 */
function cleanOCRText(text) {
  return text
    .replace(/[|]/g, 'l')         // pipe -> l
    .replace(/[{}]/g, '')         // remove braces
    .replace(/[~`]/g, '')         // remove tildes
    .replace(/\s+/g, ' ')        // normalize whitespace
    .replace(/['']/g, "'")       // normalize quotes
    .replace(/[""]/g, '"')
    .trim();
}

/**
 * Fuzzy substring match - checks if keyword partially appears in text
 * allowing for 1-2 character errors
 */
function fuzzyMatch(text, keyword) {
  if (text.includes(keyword)) return true;
  // Check if at least 70% of keyword chars appear in a sliding window
  const minLen = Math.max(3, Math.floor(keyword.length * 0.7));
  for (let i = 0; i <= text.length - minLen; i++) {
    const window = text.substring(i, i + keyword.length + 2);
    let matches = 0;
    for (const ch of keyword) {
      if (window.includes(ch)) matches++;
    }
    if (matches >= minLen) return true;
  }
  return false;
}

/**
 * Classify document based on filename hints
 */
function classifyByFilename(fileName) {
  if (!fileName) return null;
  const normalized = fileName.toLowerCase().replace(/[_\-\.]/g, ' ');

  for (const [key, docType] of Object.entries(DOCUMENT_TYPES)) {
    if (key === 'UNKNOWN' || key === 'PHOTOGRAPH') continue;
    for (const hint of (docType.filenameHints || [])) {
      if (normalized.includes(hint.toLowerCase())) {
        return { docType, confidence: 0.7, source: 'filename' };
      }
    }
  }
  return null;
}

/**
 * Classify a document based on OCR text AND filename
 * Returns scored results for all document types
 */
export function classifyDocument(ocrText, fileName = '') {
  const filenameResult = classifyByFilename(fileName);

  if (!ocrText || ocrText.trim().length < 5) {
    // If OCR failed completely, use filename classification
    if (filenameResult) {
      return {
        bestMatch: filenameResult.docType,
        confidence: filenameResult.confidence,
        scores: [{
          docType: filenameResult.docType,
          score: 70,
          matchedKeywords: [],
          matchedPatterns: [],
          confidence: filenameResult.confidence,
          source: 'filename',
        }],
        rawText: ocrText || '',
      };
    }
    return {
      bestMatch: DOCUMENT_TYPES.UNKNOWN,
      confidence: 0,
      scores: [],
      rawText: ocrText || '',
    };
  }

  const cleanedText = cleanOCRText(ocrText);
  const normalizedText = cleanedText.toLowerCase();
  const scores = [];

  for (const [key, docType] of Object.entries(DOCUMENT_TYPES)) {
    if (key === 'UNKNOWN' || key === 'PHOTOGRAPH') continue;

    let score = 0;
    let matchedKeywords = [];
    let matchedPatterns = [];

    // 1. Exact keyword scoring
    for (const keyword of docType.keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        score += 10;
        matchedKeywords.push(keyword);
      }
    }

    // 2. Fuzzy keyword scoring (catch OCR errors)
    for (const keyword of (docType.fuzzyKeywords || [])) {
      if (fuzzyMatch(normalizedText, keyword.toLowerCase())) {
        score += 6; // lower weight than exact match
        matchedKeywords.push('~' + keyword);
      }
    }

    // 3. Pattern scoring (weighted higher)
    for (const pattern of docType.patterns) {
      if (pattern.test(ocrText) || pattern.test(cleanedText)) {
        score += 25;
        matchedPatterns.push(pattern.source);
      }
    }

    // 4. Filename bonus — if filename matches, boost score significantly
    if (filenameResult && filenameResult.docType.id === docType.id) {
      score += 40;
      matchedKeywords.push('[filename match]');
    }

    // Apply document weight
    score *= docType.weight;

    if (score > 0) {
      scores.push({
        docType,
        score,
        matchedKeywords,
        matchedPatterns,
        confidence: Math.min(score / 80, 1.0), // lowered threshold from 100 to 80
      });
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // If no OCR-based match but filename matched, use filename result
  if (scores.length === 0 && filenameResult) {
    scores.push({
      docType: filenameResult.docType,
      score: 40,
      matchedKeywords: ['[filename]'],
      matchedPatterns: [],
      confidence: filenameResult.confidence,
    });
  }

  const bestMatch = scores.length > 0 ? scores[0].docType : DOCUMENT_TYPES.UNKNOWN;
  const confidence = scores.length > 0 ? scores[0].confidence : 0;

  return {
    bestMatch,
    confidence,
    scores: scores.slice(0, 5),
    rawText: ocrText,
  };
}

export { DOCUMENT_TYPES };
export default classifyDocument;
