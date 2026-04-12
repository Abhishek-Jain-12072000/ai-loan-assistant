/**
 * Entity Extraction Engine
 * Extracts structured data (names, IDs, dates, amounts, addresses)
 * from OCR text using regex patterns and heuristics for Indian documents.
 */

const ENTITY_PATTERNS = {
  // === IDENTITY NUMBERS ===
  aadhaar_number: {
    label: 'Aadhaar Number',
    patterns: [
      /(?:aadhaa?r|uid|uidai)[^\d]*(\d{4}\s?\d{4}\s?\d{4})/i,
      /\b(\d{4}\s\d{4}\s\d{4})\b/,
    ],
    format: (match) => match.replace(/\s/g, ' ').replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3'),
    validate: (val) => val.replace(/\s/g, '').length === 12,
    category: 'identity',
  },

  pan_number: {
    label: 'PAN Number',
    patterns: [
      /(?:pan|permanent\s*account)[^\w]*([A-Z]{5}\d{4}[A-Z])/i,
      /\b([A-Z]{5}\d{4}[A-Z])\b/,
    ],
    format: (match) => match.toUpperCase(),
    validate: (val) => /^[A-Z]{5}\d{4}[A-Z]$/.test(val),
    category: 'identity',
  },

  voter_id: {
    label: 'Voter ID Number',
    patterns: [
      /(?:epic|voter|electoral)[^\w]*([A-Z]{3}\d{7})/i,
      /\b([A-Z]{3}\d{7})\b/,
    ],
    format: (match) => match.toUpperCase(),
    validate: (val) => /^[A-Z]{3}\d{7}$/.test(val),
    category: 'identity',
  },

  passport_number: {
    label: 'Passport Number',
    patterns: [
      /(?:passport)[^\w]*([A-Z]\d{7})/i,
      /\b([A-Z]\d{7})\b/,
    ],
    format: (match) => match.toUpperCase(),
    validate: (val) => /^[A-Z]\d{7}$/.test(val),
    category: 'identity',
  },

  driving_license: {
    label: 'Driving License Number',
    patterns: [
      /(?:dl|driving|licen[cs]e)[^\w]*([A-Z]{2}\d{2}\s?\d{11})/i,
      /\b([A-Z]{2}\d{13})\b/,
    ],
    format: (match) => match.toUpperCase().replace(/\s/g, ''),
    validate: (val) => /^[A-Z]{2}\d{13}$/.test(val.replace(/\s/g, '')),
    category: 'identity',
  },

  // === FINANCIAL NUMBERS ===
  ifsc_code: {
    label: 'IFSC Code',
    patterns: [
      /(?:ifsc)[^\w]*([A-Z]{4}0[A-Z0-9]{6})/i,
      /\b([A-Z]{4}0[A-Z0-9]{6})\b/,
    ],
    format: (match) => match.toUpperCase(),
    validate: (val) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(val),
    category: 'financial',
  },

  account_number: {
    label: 'Bank Account Number',
    patterns: [
      /(?:a\/c|account|acct)[^\d]*(\d{9,18})/i,
      /(?:account\s*(?:no|number|#))[^\d]*(\d{9,18})/i,
    ],
    format: (match) => match,
    validate: (val) => val.length >= 9 && val.length <= 18,
    category: 'financial',
  },

  // === PERSONAL INFO ===
  name: {
    label: 'Name',
    patterns: [
      /(?:name|naam)\s*[:\-]?\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,4})/,
      /(?:shri|smt|mr\.?|mrs\.?|ms\.?)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/i,
      /(?:s\/o|d\/o|w\/o|c\/o)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/i,
    ],
    format: (match) => match.trim().replace(/\s+/g, ' '),
    validate: (val) => val.length > 2 && val.length < 100,
    category: 'personal',
  },

  father_name: {
    label: "Father's Name",
    patterns: [
      /(?:father|s\/o|son\s*of|father'?s?\s*name)\s*[:\-]?\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/i,
    ],
    format: (match) => match.trim(),
    validate: (val) => val.length > 2,
    category: 'personal',
  },

  date_of_birth: {
    label: 'Date of Birth',
    patterns: [
      /(?:d\.?o\.?b\.?|date\s*of\s*birth|birth\s*date|born)[^\d]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
      /(?:d\.?o\.?b\.?|date\s*of\s*birth)[^\d]*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/i,
    ],
    format: (match) => match.trim(),
    validate: () => true,
    category: 'personal',
  },

  gender: {
    label: 'Gender',
    patterns: [
      /(?:gender|sex)\s*[:\-]?\s*(male|female|transgender|other)/i,
      /\b(MALE|FEMALE)\b/,
    ],
    format: (match) => match.charAt(0).toUpperCase() + match.slice(1).toLowerCase(),
    validate: () => true,
    category: 'personal',
  },

  // === ADDRESS ===
  address: {
    label: 'Address',
    patterns: [
      /(?:address|addr|residential\s*address)\s*[:\-]?\s*(.{20,150})/i,
    ],
    format: (match) => match.trim().replace(/\s+/g, ' '),
    validate: (val) => val.length > 10,
    category: 'address',
  },

  pincode: {
    label: 'PIN Code',
    patterns: [
      /(?:pin|pincode|pin\s*code|postal\s*code)[^\d]*(\d{6})/i,
      /\b(\d{6})\b(?=\s*$|\s*(?:india|state|district))/i,
    ],
    format: (match) => match,
    validate: (val) => /^\d{6}$/.test(val) && parseInt(val[0]) >= 1 && parseInt(val[0]) <= 8,
    category: 'address',
  },

  // === FINANCIAL AMOUNTS ===
  salary_gross: {
    label: 'Gross Salary',
    patterns: [
      /(?:gross\s*(?:salary|pay|earning|income))\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
    ],
    format: (match) => '₹' + match.replace(/,/g, ''),
    validate: (val) => parseFloat(val.replace(/[₹,]/g, '')) > 0,
    category: 'financial',
  },

  salary_net: {
    label: 'Net Salary / Take Home',
    patterns: [
      /(?:net\s*(?:salary|pay)|take\s*home)\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
    ],
    format: (match) => '₹' + match.replace(/,/g, ''),
    validate: (val) => parseFloat(val.replace(/[₹,]/g, '')) > 0,
    category: 'financial',
  },

  total_income: {
    label: 'Total Income',
    patterns: [
      /(?:total\s*income|gross\s*total\s*income|annual\s*income)\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
    ],
    format: (match) => '₹' + match.replace(/,/g, ''),
    validate: (val) => parseFloat(val.replace(/[₹,]/g, '')) > 0,
    category: 'financial',
  },

  balance: {
    label: 'Account Balance',
    patterns: [
      /(?:closing\s*balance|available\s*balance|balance)\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
    ],
    format: (match) => '₹' + match.replace(/,/g, ''),
    validate: (val) => parseFloat(val.replace(/[₹,]/g, '')) >= 0,
    category: 'financial',
  },
};

/**
 * Extract all entities from OCR text
 */
export function extractEntities(ocrText, documentType = null) {
  if (!ocrText) return { entities: [], summary: {} };

  const entities = [];
  const summary = {};

  for (const [entityKey, entityDef] of Object.entries(ENTITY_PATTERNS)) {
    for (const pattern of entityDef.patterns) {
      const match = ocrText.match(pattern);
      if (match && match[1]) {
        const rawValue = match[1];
        const formattedValue = entityDef.format(rawValue);

        if (entityDef.validate(formattedValue)) {
          // Avoid duplicates
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
          break; // use first valid match
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
  let confidence = 0.7; // base confidence

  // Higher confidence if entity type matches document type
  const docEntityMap = {
    aadhaar: ['aadhaar_number', 'name', 'address', 'date_of_birth', 'gender', 'pincode'],
    pan: ['pan_number', 'name', 'father_name', 'date_of_birth'],
    voter_id: ['voter_id', 'name', 'father_name', 'address'],
    passport: ['passport_number', 'name', 'date_of_birth', 'address'],
    bank_statement: ['account_number', 'ifsc_code', 'name', 'balance', 'address'],
    salary_slip: ['name', 'salary_gross', 'salary_net'],
    itr: ['pan_number', 'name', 'total_income'],
  };

  if (documentType && docEntityMap[documentType]) {
    if (docEntityMap[documentType].includes(entityKey)) {
      confidence += 0.2;
    }
  }

  // Validate format strictness
  if (entityKey === 'aadhaar_number' && /^\d{4}\s\d{4}\s\d{4}$/.test(value.replace(/\s+/g, ' '))) {
    confidence += 0.1;
  }
  if (entityKey === 'pan_number' && /^[A-Z]{5}\d{4}[A-Z]$/.test(value)) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}

/**
 * Extract entities optimized for a specific document type
 */
export function extractForDocumentType(ocrText, documentType) {
  return extractEntities(ocrText, documentType);
}

export { ENTITY_PATTERNS };
export default extractEntities;
