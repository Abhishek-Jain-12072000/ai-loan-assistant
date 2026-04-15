/**
 * Entity Extraction Engine v2
 * Enhanced with OCR noise tolerance, relaxed patterns,
 * and multiple fallback strategies for Indian documents.
 */

/**
 * Clean OCR text for better extraction
 */
function cleanText(text) {
  return text
    .replace(/[|]/g, 'l')
    .replace(/[{}]/g, '')
    .replace(/[~`]/g, '')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .trim();
}

const ENTITY_PATTERNS = {
  // === IDENTITY NUMBERS ===
  aadhaar_number: {
    label: 'Aadhaar Number',
    patterns: [
      /(?:aadhaa?r|uid|uidai|adhar|adhaar)[^\d]*(\d{4}\s?\d{4}\s?\d{4})/i,
      /(\d{4}\s\d{4}\s\d{4})/,                      // spaced 12-digit
      /(\d{4}[\s._\-]?\d{4}[\s._\-]?\d{4})/,        // various separators
      /(\d{12})/,                                     // continuous 12-digit (fallback)
    ],
    format: (match) => {
      const digits = match.replace(/\D/g, '');
      if (digits.length === 12) {
        return `${digits.slice(0,4)} ${digits.slice(4,8)} ${digits.slice(8,12)}`;
      }
      return match.replace(/\s+/g, ' ');
    },
    validate: (val) => val.replace(/\D/g, '').length === 12,
    category: 'identity',
  },

  pan_number: {
    label: 'PAN Number',
    patterns: [
      /(?:pan|permanent\s*account)[^\w]*([A-Z]{5}\d{4}[A-Z])/i,
      /([A-Z]{5}\d{4}[A-Z])/,                       // standalone PAN
      /([A-Z]{3}[A-Z]{2}\d{4}[A-Z])/,               // slightly noisy
    ],
    format: (match) => match.toUpperCase().trim(),
    validate: (val) => /^[A-Z]{5}\d{4}[A-Z]$/.test(val.trim()),
    category: 'identity',
  },

  voter_id: {
    label: 'Voter ID Number',
    patterns: [
      /(?:epic|voter|electoral)[^\w]*([A-Z]{3}\d{7})/i,
      /([A-Z]{3}\d{7})/,
    ],
    format: (match) => match.toUpperCase().trim(),
    validate: (val) => /^[A-Z]{3}\d{7}$/.test(val.trim()),
    category: 'identity',
  },

  passport_number: {
    label: 'Passport Number',
    patterns: [
      /(?:passport)[^\w]*([A-Z]\d{7})/i,
      /([A-Z]\d{7})/,
    ],
    format: (match) => match.toUpperCase().trim(),
    validate: (val) => /^[A-Z]\d{7}$/.test(val.trim()),
    category: 'identity',
  },

  driving_license: {
    label: 'Driving License Number',
    patterns: [
      /(?:dl|driving|licen[cs]e)[^\w]*([A-Z]{2}\d{2}\s?\d{11})/i,
      /([A-Z]{2}\d{13})/,
    ],
    format: (match) => match.toUpperCase().replace(/\s/g, '').trim(),
    validate: (val) => /^[A-Z]{2}\d{13}$/.test(val.replace(/\s/g, '')),
    category: 'identity',
  },

  // === FINANCIAL NUMBERS ===
  ifsc_code: {
    label: 'IFSC Code',
    patterns: [
      /(?:ifsc)[^\w]*([A-Z]{4}0[A-Z0-9]{6})/i,
      /([A-Z]{4}0[A-Z0-9]{6})/,
    ],
    format: (match) => match.toUpperCase().trim(),
    validate: (val) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(val.trim()),
    category: 'financial',
  },

  account_number: {
    label: 'Bank Account Number',
    patterns: [
      /(?:a\/c|account|acct)\s*(?:no|number|#|:)?\s*[:\-]?\s*(\d{9,18})/i,
      /(?:account\s*(?:no|number|#))\s*[:\-]?\s*(\d{9,18})/i,
    ],
    format: (match) => match.trim(),
    validate: (val) => val.length >= 9 && val.length <= 18,
    category: 'financial',
  },

  // === PERSONAL INFO ===
  name: {
    label: 'Name',
    patterns: [
      // Standard label: value patterns
      /(?:name|naam)\s*[:\-]?\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,4})/,
      // Honorific prefix patterns
      /(?:shri|smt|mr\.?|mrs\.?|ms\.?|kumari?)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/i,
      // Relation patterns (find the name after them)
      /(?:s\/o|d\/o|w\/o|c\/o)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/i,
      // Relaxed: any 2+ capitalized words in a row (common in ID cards)
      /\b([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b/,
    ],
    format: (match) => match.trim().replace(/\s+/g, ' '),
    validate: (val) => {
      const cleaned = val.trim();
      // Must be 2+ words, reasonable length, not all-caps common words
      const skipWords = ['government', 'india', 'unique', 'identification', 'authority', 'income', 'department', 'election', 'commission'];
      const lower = cleaned.toLowerCase();
      if (skipWords.some(w => lower.includes(w))) return false;
      return cleaned.length > 3 && cleaned.length < 80 && cleaned.includes(' ');
    },
    category: 'personal',
  },

  father_name: {
    label: "Father's Name",
    patterns: [
      /(?:father|s\/o|son\s*of|father'?s?\s*name)\s*[:\-]?\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/i,
      /(?:s\/o|S\/O)\s*[:\-]?\s*(.{3,40})/,
    ],
    format: (match) => match.trim().replace(/\s+/g, ' '),
    validate: (val) => val.trim().length > 2 && val.trim().length < 60,
    category: 'personal',
  },

  date_of_birth: {
    label: 'Date of Birth',
    patterns: [
      /(?:d\.?o\.?b\.?|date\s*of\s*birth|birth\s*date|born|DOB)[^\d]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
      /(?:d\.?o\.?b\.?|date\s*of\s*birth|DOB)[^\d]*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4})/i,
      // Relaxed date patterns (DD/MM/YYYY anywhere in text)
      /(\d{2}[\/-]\d{2}[\/-]\d{4})/,
      /(\d{2}[\/-]\d{2}[\/-]\d{2})/,
    ],
    format: (match) => match.trim(),
    validate: (val) => {
      // Basic sanity check - should have digits
      return /\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/.test(val) ||
             /\d{1,2}\s+[a-z]+\s+\d{4}/i.test(val);
    },
    category: 'personal',
  },

  gender: {
    label: 'Gender',
    patterns: [
      /(?:gender|sex)\s*[:\-]?\s*(male|female|transgender|other)/i,
      /\b(MALE|FEMALE|Male|Female)\b/,
      // Hindi gender markers on Aadhaar
      /\b(पुरुष|महिला|male|female)\b/i,
    ],
    format: (match) => {
      const m = match.trim().toLowerCase();
      if (m === 'पुरुष' || m === 'male') return 'Male';
      if (m === 'महिला' || m === 'female') return 'Female';
      return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
    },
    validate: () => true,
    category: 'personal',
  },

  // === ADDRESS ===
  address: {
    label: 'Address',
    patterns: [
      /(?:address|addr|residential\s*address|add)\s*[:\-]?\s*(.{15,200})/i,
      // Common Indian address patterns
      /(\d+[\s,]+[A-Za-z]+(?:\s+[A-Za-z]+){2,}[\s,]+(?:road|street|lane|nagar|colony|sector|block|mohalla|gali|ward|house|flat|floor|apt|apartment|plot|bldg|building)[^,\n]*)/i,
    ],
    format: (match) => match.trim().replace(/\s+/g, ' ').substring(0, 200),
    validate: (val) => val.trim().length > 10,
    category: 'address',
  },

  pincode: {
    label: 'PIN Code',
    patterns: [
      /(?:pin|pincode|pin\s*code|postal\s*code)\s*[:\-]?\s*(\d{6})/i,
      // 6-digit number at end of address-like text
      /(?:india|state|dist|city|town)\s*[,:\-]?\s*(\d{6})/i,
      // Standalone 6-digit starting with 1-8
      /\b([1-8]\d{5})\b/,
    ],
    format: (match) => match.trim(),
    validate: (val) => /^\d{6}$/.test(val.trim()) && parseInt(val[0]) >= 1 && parseInt(val[0]) <= 8,
    category: 'address',
  },

  // === FINANCIAL AMOUNTS ===
  salary_gross: {
    label: 'Gross Salary',
    patterns: [
      /(?:gross\s*(?:salary|pay|earning|income))\s*[:\-]?\s*(?:rs\.?|inr|₹|INR)?\s*([\d,]+(?:\.\d{1,2})?)/i,
      /(?:gross)\s*[:\-]?\s*(?:rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    ],
    format: (match) => '₹' + match.replace(/,/g, '').trim(),
    validate: (val) => parseFloat(val.replace(/[₹,\s]/g, '')) > 0,
    category: 'financial',
  },

  salary_net: {
    label: 'Net Salary / Take Home',
    patterns: [
      /(?:net\s*(?:salary|pay)|take\s*home|net\s*amount)\s*[:\-]?\s*(?:rs\.?|inr|₹|INR)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    ],
    format: (match) => '₹' + match.replace(/,/g, '').trim(),
    validate: (val) => parseFloat(val.replace(/[₹,\s]/g, '')) > 0,
    category: 'financial',
  },

  total_income: {
    label: 'Total Income',
    patterns: [
      /(?:total\s*income|gross\s*total\s*income|annual\s*income|taxable\s*income)\s*[:\-]?\s*(?:rs\.?|inr|₹|INR)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    ],
    format: (match) => '₹' + match.replace(/,/g, '').trim(),
    validate: (val) => parseFloat(val.replace(/[₹,\s]/g, '')) > 0,
    category: 'financial',
  },

  balance: {
    label: 'Account Balance',
    patterns: [
      /(?:closing\s*balance|available\s*balance|current\s*balance|balance)\s*[:\-]?\s*(?:rs\.?|inr|₹|INR)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    ],
    format: (match) => '₹' + match.replace(/,/g, '').trim(),
    validate: (val) => parseFloat(val.replace(/[₹,\s]/g, '')) >= 0,
    category: 'financial',
  },
};

/**
 * Extract all entities from OCR text
 */
export function extractEntities(ocrText, documentType = null) {
  if (!ocrText) return { entities: [], summary: {} };

  const cleaned = cleanText(ocrText);
  const entities = [];
  const summary = {};

  for (const [entityKey, entityDef] of Object.entries(ENTITY_PATTERNS)) {
    // Try both original and cleaned text
    for (const textToSearch of [ocrText, cleaned]) {
      if (summary[entityKey]) break; // already found

      for (const pattern of entityDef.patterns) {
        const match = textToSearch.match(pattern);
        if (match && match[1]) {
          const rawValue = match[1];
          try {
            const formattedValue = entityDef.format(rawValue);
            if (entityDef.validate(formattedValue)) {
              if (!summary[entityKey]) {
                const entity = {
                  key: entityKey,
                  label: entityDef.label,
                  value: formattedValue,
                  rawValue,
                  category: entityDef.category,
                  confidence: calculateConfidence(entityKey, formattedValue, documentType),
                };
                entities.push(entity);
                summary[entityKey] = formattedValue;
              }
              break;
            }
          } catch (e) {
            // skip invalid format/validate
            continue;
          }
        }
      }
    }
  }

  return { entities, summary };
}

/**
 * Calculate confidence score for an extracted entity
 */
function calculateConfidence(entityKey, value, documentType) {
  let confidence = 0.65;

  const docEntityMap = {
    aadhaar: ['aadhaar_number', 'name', 'address', 'date_of_birth', 'gender', 'pincode'],
    pan: ['pan_number', 'name', 'father_name', 'date_of_birth'],
    voter_id: ['voter_id', 'name', 'father_name', 'address'],
    passport: ['passport_number', 'name', 'date_of_birth', 'address'],
    driving_license: ['driving_license', 'name', 'date_of_birth', 'address'],
    bank_statement: ['account_number', 'ifsc_code', 'name', 'balance', 'address'],
    salary_slip: ['name', 'salary_gross', 'salary_net'],
    itr: ['pan_number', 'name', 'total_income'],
    utility_bill: ['name', 'address', 'pincode'],
  };

  if (documentType && docEntityMap[documentType]) {
    if (docEntityMap[documentType].includes(entityKey)) {
      confidence += 0.2;
    }
  }

  // Format-specific boosts
  if (entityKey === 'aadhaar_number') {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 12) confidence += 0.1;
  }
  if (entityKey === 'pan_number' && /^[A-Z]{5}\d{4}[A-Z]$/.test(value)) {
    confidence += 0.1;
  }
  if (entityKey === 'pincode' && /^[1-8]\d{5}$/.test(value)) {
    confidence += 0.05;
  }

  return Math.min(confidence, 1.0);
}

export function extractForDocumentType(ocrText, documentType) {
  return extractEntities(ocrText, documentType);
}

export { ENTITY_PATTERNS };
export default extractEntities;
