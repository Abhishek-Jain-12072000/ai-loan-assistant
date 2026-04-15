#!/usr/bin/env node

/**
 * Auto Rate Updater — runs at build time (prebuild hook)
 *
 * Scrapes latest loan interest rates from public Indian bank pages.
 * RULES:
 *   1. If a bank scrape fails → skip it, keep existing rate, move to next
 *   2. If ALL scrapes fail → keep entire existing bankData.js untouched
 *   3. Build NEVER breaks because of this script
 *   4. Updates LAST_UPDATED timestamp only if at least 1 bank was updated
 *
 * Sources scraped:
 *   - Individual bank websites (official rate pages)
 *   - RBI lending rate page
 *   - Public aggregator pages (BankBazaar, PaisaBazaar style HTML)
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BANK_DATA_PATH = path.join(__dirname, '..', 'src', 'data', 'bankData.js');

// Timeout for each fetch (8 seconds — generous but won't stall CI)
const FETCH_TIMEOUT = 8000;

// ============================================================
// SCRAPE SOURCES — each entry maps a bank id + loan type to a URL
// and a parser function that extracts {rateMin, rateMax} from HTML
// ============================================================

const SCRAPE_SOURCES = [
  // ------- AGGREGATOR PAGES (one page → many banks) -------
  {
    id: 'aggregator_home_loan',
    url: 'https://www.bankbazaar.com/home-loan-interest-rate.html',
    parser: parseAggregatorHomeLoan,
    description: 'BankBazaar home loan rates',
  },
  {
    id: 'aggregator_personal_loan',
    url: 'https://www.bankbazaar.com/personal-loan-interest-rate.html',
    parser: parseAggregatorPersonalLoan,
    description: 'BankBazaar personal loan rates',
  },
  {
    id: 'aggregator_car_loan',
    url: 'https://www.bankbazaar.com/car-loan-interest-rate.html',
    parser: parseAggregatorCarLoan,
    description: 'BankBazaar car loan rates',
  },
  {
    id: 'aggregator_education_loan',
    url: 'https://www.bankbazaar.com/education-loan-interest-rate.html',
    parser: parseAggregatorEducationLoan,
    description: 'BankBazaar education loan rates',
  },

  // ------- INDIVIDUAL BANK PAGES (fallback / supplementary) -------
  {
    id: 'sbi_home',
    url: 'https://sbi.co.in/web/interest-rates/interest-rates/loan-schemes-interest-rates/home-loans',
    parser: parseSBIHomeLoan,
    description: 'SBI official home loan page',
  },
  {
    id: 'sbi_personal',
    url: 'https://sbi.co.in/web/interest-rates/interest-rates/loan-schemes-interest-rates/personal-loans',
    parser: parseSBIPersonalLoan,
    description: 'SBI official personal loan page',
  },
  {
    id: 'sbi_education',
    url: 'https://sbi.co.in/web/interest-rates/interest-rates/loan-schemes-interest-rates/education-loan-scheme',
    parser: parseSBIEducationLoan,
    description: 'SBI official education loan page',
  },
  {
    id: 'hdfc_home',
    url: 'https://www.hdfc.com/home-loan-interest-rate',
    parser: parseHDFCHomeLoan,
    description: 'HDFC home loan page',
  },
  {
    id: 'icici_home',
    url: 'https://www.icicibank.com/personal-banking/loans/home-loan/interest-rate',
    parser: parseICICIHomeLoan,
    description: 'ICICI home loan page',
  },
];

// ============================================================
// FETCH HELPER — with timeout, redirects, and error swallowing
// ============================================================

function fetchPage(url, timeoutMs = FETCH_TIMEOUT) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;

    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LoanRateBot/1.0; +https://github.com/ai-loan-processor)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-IN,en;q=0.9',
      },
      timeout: timeoutMs,
    }, (res) => {
      // Follow redirects (up to 3)
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        fetchPage(redirectUrl, timeoutMs).then(resolve);
        return;
      }

      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', () => resolve(null));
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    // Hard safety timeout
    setTimeout(() => {
      req.destroy();
      resolve(null);
    }, timeoutMs + 2000);
  });
}

// ============================================================
// PARSER HELPERS
// ============================================================

/**
 * Extract all numbers that look like interest rates (4.0 – 25.0) from text
 */
function extractRates(text) {
  const matches = text.match(/(\d{1,2}\.\d{1,2})\s*%/g);
  if (!matches) return [];
  return matches
    .map(m => parseFloat(m.replace('%', '').trim()))
    .filter(n => n >= 4.0 && n <= 30.0);
}

/**
 * From a chunk of HTML text around a bank name, find min and max rate
 */
function findRateRange(html, bankKeywords, loanKeywords) {
  // Try to find a section mentioning the bank
  const lowerHtml = html.toLowerCase();

  for (const bankKw of bankKeywords) {
    const idx = lowerHtml.indexOf(bankKw.toLowerCase());
    if (idx === -1) continue;

    // Grab a window around the bank mention
    const start = Math.max(0, idx - 200);
    const end = Math.min(html.length, idx + 800);
    const section = html.substring(start, end);

    const rates = extractRates(section);
    if (rates.length >= 1) {
      const min = Math.min(...rates);
      const max = rates.length > 1 ? Math.max(...rates) : min + 2.0;
      return { rateMin: min, rateMax: max };
    }
  }
  return null;
}

/**
 * Bank name keyword map for matching in HTML
 */
const BANK_KEYWORDS = {
  sbi: ['state bank of india', 'sbi '],
  bob: ['bank of baroda', 'bob '],
  pnb: ['punjab national bank', 'pnb '],
  canara: ['canara bank'],
  union: ['union bank of india'],
  indian: ['indian bank'],
  idbi: ['idbi bank'],
  boi: ['bank of india'],
  hdfc: ['hdfc bank', 'hdfc ltd'],
  icici: ['icici bank'],
  axis: ['axis bank'],
  kotak: ['kotak mahindra', 'kotak bank'],
  bajaj: ['bajaj finserv', 'bajaj finance'],
  lic_hfl: ['lic housing', 'lic hfl'],
  tata_capital: ['tata capital'],
};

// ============================================================
// AGGREGATOR PARSERS
// ============================================================

function parseAggregatorHomeLoan(html) {
  const updates = {};
  for (const [bankId, keywords] of Object.entries(BANK_KEYWORDS)) {
    const result = findRateRange(html, keywords, ['home loan', 'housing loan']);
    if (result) {
      updates[bankId] = { home_loan: result };
    }
  }
  return updates;
}

function parseAggregatorPersonalLoan(html) {
  const updates = {};
  for (const [bankId, keywords] of Object.entries(BANK_KEYWORDS)) {
    const result = findRateRange(html, keywords, ['personal loan']);
    if (result) {
      updates[bankId] = { personal_loan: result };
    }
  }
  return updates;
}

function parseAggregatorCarLoan(html) {
  const updates = {};
  for (const [bankId, keywords] of Object.entries(BANK_KEYWORDS)) {
    const result = findRateRange(html, keywords, ['car loan', 'auto loan', 'vehicle loan']);
    if (result) {
      updates[bankId] = { vehicle_loan: result };
    }
  }
  return updates;
}

function parseAggregatorEducationLoan(html) {
  const updates = {};
  for (const [bankId, keywords] of Object.entries(BANK_KEYWORDS)) {
    const result = findRateRange(html, keywords, ['education loan', 'study loan']);
    if (result) {
      updates[bankId] = { education_loan: result };
    }
  }
  return updates;
}

// ============================================================
// INDIVIDUAL BANK PARSERS
// ============================================================

function parseSBIHomeLoan(html) {
  const rates = extractRates(html);
  if (rates.length >= 1) {
    return { sbi: { home_loan: { rateMin: Math.min(...rates), rateMax: Math.max(...rates) } } };
  }
  return {};
}

function parseSBIPersonalLoan(html) {
  const rates = extractRates(html);
  if (rates.length >= 1) {
    return { sbi: { personal_loan: { rateMin: Math.min(...rates), rateMax: Math.max(...rates) } } };
  }
  return {};
}

function parseSBIEducationLoan(html) {
  const rates = extractRates(html);
  if (rates.length >= 1) {
    return { sbi: { education_loan: { rateMin: Math.min(...rates), rateMax: Math.max(...rates) } } };
  }
  return {};
}

function parseHDFCHomeLoan(html) {
  const rates = extractRates(html);
  if (rates.length >= 1) {
    return { hdfc: { home_loan: { rateMin: Math.min(...rates), rateMax: Math.max(...rates) } } };
  }
  return {};
}

function parseICICIHomeLoan(html) {
  const rates = extractRates(html);
  if (rates.length >= 1) {
    return { icici: { home_loan: { rateMin: Math.min(...rates), rateMax: Math.max(...rates) } } };
  }
  return {};
}

// ============================================================
// RATE VALIDATION — sanity check before applying
// ============================================================

function isValidRate(rate) {
  return typeof rate === 'number' && rate >= 4.0 && rate <= 30.0;
}

function isValidUpdate(bankId, loanType, newRates, existingBankData) {
  if (!isValidRate(newRates.rateMin) || !isValidRate(newRates.rateMax)) return false;
  if (newRates.rateMin > newRates.rateMax) return false;
  if (newRates.rateMax - newRates.rateMin > 15) return false; // suspicious spread

  // Check it's not wildly different from existing (> 3% absolute change = suspicious)
  const existing = findExistingRate(bankId, loanType, existingBankData);
  if (existing) {
    if (Math.abs(newRates.rateMin - existing.rateMin) > 3.0) return false;
    if (Math.abs(newRates.rateMax - existing.rateMax) > 3.0) return false;
  }

  return true;
}

function findExistingRate(bankId, loanType, existingContent) {
  // Quick regex to pull existing rates from the file content
  const bankBlock = extractBankBlock(bankId, existingContent);
  if (!bankBlock) return null;

  const loanBlock = extractLoanBlock(loanType, bankBlock);
  if (!loanBlock) return null;

  const minMatch = loanBlock.match(/rateMin:\s*([\d.]+)/);
  const maxMatch = loanBlock.match(/rateMax:\s*([\d.]+)/);
  if (minMatch && maxMatch) {
    return { rateMin: parseFloat(minMatch[1]), rateMax: parseFloat(maxMatch[1]) };
  }
  return null;
}

function extractBankBlock(bankId, content) {
  const regex = new RegExp(`id:\\s*'${bankId}'[\\s\\S]*?(?=\\n  \\{\\n    id:|\\n];)`, 'i');
  const match = content.match(regex);
  return match ? match[0] : null;
}

function extractLoanBlock(loanType, bankBlock) {
  const regex = new RegExp(`${loanType}:\\s*\\{[\\s\\S]*?\\},`, 'i');
  const match = bankBlock.match(regex);
  return match ? match[0] : null;
}

// ============================================================
// FILE UPDATER — patches bankData.js in-place
// ============================================================

function applyUpdates(filePath, allUpdates) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let updateCount = 0;

  for (const [bankId, loanUpdates] of Object.entries(allUpdates)) {
    for (const [loanType, rates] of Object.entries(loanUpdates)) {
      if (!isValidUpdate(bankId, loanType, rates, originalContent)) {
        console.log(`  ⚠ Skipped ${bankId}/${loanType} — failed validation (min:${rates.rateMin}, max:${rates.rateMax})`);
        continue;
      }

      // Replace rateMin and rateMax in the specific bank+loan section
      const updated = updateRateInContent(content, bankId, loanType, rates);
      if (updated !== content) {
        content = updated;
        updateCount++;
        console.log(`  ✓ Updated ${bankId}/${loanType}: ${rates.rateMin}% – ${rates.rateMax}%`);
      }
    }
  }

  // Update LAST_UPDATED if we changed anything
  if (updateCount > 0) {
    const today = new Date().toISOString().split('T')[0];
    content = content.replace(
      /export const LAST_UPDATED = '[^']+'/,
      `export const LAST_UPDATED = '${today}'`
    );
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return updateCount;
}

function updateRateInContent(content, bankId, loanType, rates) {
  // Strategy: find the bank by id, then within that bank find the loan type block,
  // then replace rateMin and rateMax values

  // Find bank start
  const bankIdPattern = new RegExp(`(id:\\s*'${bankId}')`);
  const bankMatch = content.match(bankIdPattern);
  if (!bankMatch) return content;

  const bankStart = bankMatch.index;

  // Find the loan type within this bank block
  const afterBank = content.substring(bankStart);
  const loanPattern = new RegExp(`(${loanType}:\\s*\\{)`);
  const loanMatch = afterBank.match(loanPattern);
  if (!loanMatch) return content;

  const loanStart = bankStart + loanMatch.index;

  // Find the closing of this loan object (next '},')
  const afterLoan = content.substring(loanStart);
  const closingIdx = afterLoan.indexOf('},');
  if (closingIdx === -1) return content;

  const loanBlock = afterLoan.substring(0, closingIdx + 2);

  // Replace rateMin and rateMax
  let newBlock = loanBlock
    .replace(/rateMin:\s*[\d.]+/, `rateMin: ${rates.rateMin}`)
    .replace(/rateMax:\s*[\d.]+/, `rateMax: ${rates.rateMax}`);

  if (newBlock === loanBlock) return content;

  return content.substring(0, loanStart) + newBlock + content.substring(loanStart + loanBlock.length);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  🏦 Loan Rate Auto-Updater (Build-Time)     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  // Check if bankData.js exists
  if (!fs.existsSync(BANK_DATA_PATH)) {
    console.log('⚠ bankData.js not found — skipping rate update');
    process.exit(0); // never fail
  }

  const allUpdates = {}; // { bankId: { loanType: { rateMin, rateMax } } }
  let successCount = 0;
  let failCount = 0;

  for (const source of SCRAPE_SOURCES) {
    try {
      console.log(`→ Fetching: ${source.description}...`);
      const html = await fetchPage(source.url);

      if (!html) {
        console.log(`  ✗ Failed to fetch (timeout/error) — skipping`);
        failCount++;
        continue;
      }

      const updates = source.parser(html);
      if (!updates || Object.keys(updates).length === 0) {
        console.log(`  ✗ No rates parsed — skipping`);
        failCount++;
        continue;
      }

      // Merge into allUpdates
      for (const [bankId, loans] of Object.entries(updates)) {
        if (!allUpdates[bankId]) allUpdates[bankId] = {};
        for (const [loanType, rates] of Object.entries(loans)) {
          // Only overwrite if we don't already have a value (first source wins)
          if (!allUpdates[bankId][loanType]) {
            allUpdates[bankId][loanType] = rates;
          }
        }
      }

      const bankCount = Object.keys(updates).length;
      console.log(`  ✓ Parsed rates for ${bankCount} bank(s)`);
      successCount++;

    } catch (err) {
      // CATCH EVERYTHING — never break the build
      console.log(`  ✗ Error: ${err.message} — skipping`);
      failCount++;
      continue;
    }
  }

  console.log('');
  console.log(`Sources: ${successCount} succeeded, ${failCount} failed`);

  // Apply updates
  const totalBankUpdates = Object.keys(allUpdates).length;
  if (totalBankUpdates > 0) {
    console.log(`Applying updates for ${totalBankUpdates} bank(s)...`);
    const applied = applyUpdates(BANK_DATA_PATH, allUpdates);
    console.log(`✅ Applied ${applied} rate update(s) to bankData.js`);
  } else {
    console.log('ℹ No new rates scraped — keeping existing data unchanged');
  }

  console.log('');
  console.log('Build continuing... ✓');
  console.log('');

  // ALWAYS exit 0 — build must never break
  process.exit(0);
}

// Run and catch any top-level error
main().catch((err) => {
  console.error('Rate updater crashed (non-fatal):', err.message);
  console.log('Build continuing with existing rates... ✓');
  process.exit(0); // NEVER fail
});
