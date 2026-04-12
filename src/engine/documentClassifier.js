/**
 * Document Classifier Engine
 * Categorizes Indian documents using keyword matching, pattern recognition,
 * and weighted scoring for loan processing.
 */

const DOCUMENT_TYPES = {
  AADHAAR: {
    id: 'aadhaar',
    label: 'Aadhaar Card',
    category: 'identity',
    icon: 'IdCard',
    color: '#f97316',
    keywords: [
      'aadhaar', 'aadhar', 'uid', 'unique identification',
      'uidai', 'government of india', 'enrolment', 'enrollment',
      'address', 'male', 'female', 'date of birth', 'dob',
      'vid', 'virtual id'
    ],
    patterns: [
      /\b\d{4}\s?\d{4}\s?\d{4}\b/,          // 12-digit Aadhaar number
      /\bVID\s*:\s*\d{16}\b/i,                // Virtual ID
      /unique\s*identification/i,
      /uidai/i,
      /aadhaa?r/i,
    ],
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
      'father', 'name', 'date of birth', 'signature'
    ],
    patterns: [
      /\b[A-Z]{5}\d{4}[A-Z]\b/,              // PAN format: ABCDE1234F
      /permanent\s*account\s*number/i,
      /income\s*tax\s*department/i,
      /it\s*dept/i,
    ],
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
      'constituency', 'assembly'
    ],
    patterns: [
      /\b[A-Z]{3}\d{7}\b/,                    // Voter ID format
      /election\s*commission/i,
      /electors?\s*photo\s*identity/i,
      /epic\s*no/i,
    ],
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
      'emigration', 'type', 'country code', 'given name', 'surname'
    ],
    patterns: [
      /\b[A-Z]\d{7}\b/,                       // Passport number
      /republic\s*of\s*india/i,
      /passport\s*no/i,
      /date\s*of\s*expiry/i,
    ],
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
      'non-transport', 'transport', 'authorization'
    ],
    patterns: [
      /\b[A-Z]{2}\d{2}\s?\d{11}\b/,           // DL format
      /driving\s*licen[cs]e/i,
      /class\s*of\s*vehicle/i,
      /regional\s*transport/i,
    ],
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
      'upi', 'imps', 'withdrawal', 'deposit', 'interest'
    ],
    patterns: [
      /\b\d{9,18}\b/,                          // Account number
      /\b[A-Z]{4}0[A-Z0-9]{6}\b/,             // IFSC code
      /opening\s*balance/i,
      /closing\s*balance/i,
      /statement\s*of\s*account/i,
      /account\s*statement/i,
    ],
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
      'epf', 'esi', 'professional tax', 'tds'
    ],
    patterns: [
      /salary\s*slip/i,
      /pay\s*slip/i,
      /gross\s*(salary|pay|earning)/i,
      /net\s*(salary|pay)/i,
      /basic\s*(salary|pay)/i,
      /house\s*rent\s*allowance|hra/i,
    ],
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
      'deductions', 'section 80c', 'chapter vi'
    ],
    patterns: [
      /income\s*tax\s*return/i,
      /itr[\s-]?\d/i,
      /assessment\s*year/i,
      /form\s*(?:no\.?\s*)?16/i,
      /e[\s-]*filing/i,
      /acknowledgement\s*number/i,
    ],
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
      'sanctioned load', 'reading'
    ],
    patterns: [
      /electricity\s*bill/i,
      /consumer\s*(no|number|id)/i,
      /billing\s*period/i,
      /meter\s*(no|number|reading)/i,
      /due\s*date/i,
      /amount\s*(due|payable)/i,
    ],
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
      'mutation', 'khata', 'patta', 'survey number'
    ],
    patterns: [
      /sale\s*deed/i,
      /registration\s*(no|number)/i,
      /sub[\s-]*registrar/i,
      /stamp\s*duty/i,
      /encumbrance\s*certificate/i,
      /survey\s*(no|number)/i,
    ],
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
    patterns: [],
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
    patterns: [],
    weight: 0,
    requiredForLoan: false,
  }
};

/**
 * Classify a document based on OCR text
 * Returns scored results for all document types
 */
export function classifyDocument(ocrText) {
  if (!ocrText || ocrText.trim().length < 10) {
    return {
      bestMatch: DOCUMENT_TYPES.UNKNOWN,
      confidence: 0,
      scores: [],
      rawText: ocrText || '',
    };
  }

  const normalizedText = ocrText.toLowerCase().replace(/\s+/g, ' ');
  const scores = [];

  for (const [key, docType] of Object.entries(DOCUMENT_TYPES)) {
    if (key === 'UNKNOWN' || key === 'PHOTOGRAPH') continue;

    let score = 0;
    let matchedKeywords = [];
    let matchedPatterns = [];

    // Keyword scoring
    for (const keyword of docType.keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        score += 10;
        matchedKeywords.push(keyword);
      }
    }

    // Pattern scoring (weighted higher)
    for (const pattern of docType.patterns) {
      if (pattern.test(ocrText)) {
        score += 25;
        matchedPatterns.push(pattern.source);
      }
    }

    // Apply document weight
    score *= docType.weight;

    if (score > 0) {
      scores.push({
        docType,
        score,
        matchedKeywords,
        matchedPatterns,
        confidence: Math.min(score / 100, 1.0),
      });
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const bestMatch = scores.length > 0 ? scores[0].docType : DOCUMENT_TYPES.UNKNOWN;
  const confidence = scores.length > 0 ? scores[0].confidence : 0;

  return {
    bestMatch,
    confidence,
    scores: scores.slice(0, 5), // top 5 matches
    rawText: ocrText,
  };
}

export { DOCUMENT_TYPES };
export default classifyDocument;
