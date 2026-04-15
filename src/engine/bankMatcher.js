/**
 * Bank Matching Engine
 * Ranks banks based on user's loan profile, documents, and income.
 */

import { BANKS, calculateEMI } from '../data/bankData.js';

/**
 * Match and rank banks for a given loan type based on applicant profile
 *
 * @param {string} loanType - e.g., 'home_loan', 'personal_loan'
 * @param {object} profile - applicant profile from loanProfiler
 * @param {object} eligibility - eligibility assessment from loanProfiler
 * @returns {Array} sorted bank matches with scores
 */
export function matchBanks(loanType, profile, eligibility) {
  const annualIncome = estimateAnnualIncome(profile);
  const monthlyIncome = annualIncome / 12;
  const hasWomanBorrower = detectWomanBorrower(profile);
  const isSalaried = detectSalaried(profile);
  const docTypes = profile.documentTypes || [];

  // Get the matching assessment
  const assessment = eligibility?.assessments?.find(
    a => a.loanType?.id === loanType
  );

  const matches = [];

  for (const bank of BANKS) {
    const loan = bank.loans[loanType];
    if (!loan) continue;

    const match = {
      bank,
      loan,
      loanType,
      score: 0,
      reasons: [],
      warnings: [],
      estimatedRate: null,
      estimatedEMI: null,
      eligible: true,
    };

    // 1. Income eligibility check
    if (monthlyIncome > 0 && loan.minIncome > 0) {
      if (monthlyIncome >= loan.minIncome) {
        const incomeMultiple = monthlyIncome / loan.minIncome;
        match.score += Math.min(incomeMultiple * 10, 30);
        match.reasons.push('Income meets minimum requirement');
      } else {
        match.eligible = false;
        match.warnings.push(`Min monthly income: ₹${loan.minIncome.toLocaleString('en-IN')}`);
      }
    }

    // 2. Rate scoring — lower rate = higher score
    const rateScore = Math.max(0, 30 - (loan.rateMin - 7) * 5);
    match.score += rateScore;

    // 3. Bank type preference
    if (bank.type === 'Public Sector') {
      match.score += 5; // generally lower rates & fees
      match.reasons.push('PSU bank — typically lower rates');
    }

    // 4. Special concessions
    if (hasWomanBorrower && loan.features?.some(f => f.toLowerCase().includes('women'))) {
      match.score += 10;
      match.reasons.push('Special rate for women borrowers');
    }

    // 5. Processing fee scoring
    if (loan.processingFee.toLowerCase().includes('nil') || loan.processingFee === '0') {
      match.score += 10;
      match.reasons.push('Zero processing fee');
    }

    // 6. Feature bonus
    if (loan.features?.some(f => f.toLowerCase().includes('pre-approved'))) {
      match.score += 3;
    }
    if (loan.features?.some(f => f.toLowerCase().includes('collateral-free') || f.toLowerCase().includes('no collateral'))) {
      match.score += 3;
    }

    // 7. Document readiness bonus
    if (assessment) {
      const docCoverage = assessment.documentScore / 100;
      match.score += docCoverage * 15;
      if (docCoverage >= 0.8) {
        match.reasons.push('Strong document coverage for this bank');
      }
    }

    // Estimate rate (mid-range, adjusted slightly by income if available)
    if (monthlyIncome > 0 && monthlyIncome >= loan.minIncome * 2) {
      // Higher income = closer to minimum rate
      match.estimatedRate = loan.rateMin + (loan.rateMax - loan.rateMin) * 0.25;
    } else if (monthlyIncome > 0 && monthlyIncome >= loan.minIncome) {
      match.estimatedRate = loan.rateMin + (loan.rateMax - loan.rateMin) * 0.5;
    } else {
      match.estimatedRate = loan.rateMin + (loan.rateMax - loan.rateMin) * 0.6;
    }
    match.estimatedRate = Math.round(match.estimatedRate * 100) / 100;

    // Normalize score
    match.score = Math.round(Math.min(match.score, 100));

    matches.push(match);
  }

  // Sort by score descending, then by rate ascending
  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.loan.rateMin - b.loan.rateMin;
  });

  // Tag top 3 as "Best Match"
  matches.forEach((m, i) => {
    m.rank = i + 1;
    m.isBestMatch = i < 3 && m.eligible;
  });

  return matches;
}

/**
 * Get a summary comparison across all loan types for the profile
 */
export function getBankSummary(profile, eligibility) {
  const loanTypes = ['home_loan', 'personal_loan', 'vehicle_loan', 'education_loan', 'business_loan'];
  const summary = {};

  for (const lt of loanTypes) {
    const matches = matchBanks(lt, profile, eligibility);
    summary[lt] = {
      totalBanks: matches.length,
      eligibleBanks: matches.filter(m => m.eligible).length,
      bestRate: matches.length > 0 ? Math.min(...matches.map(m => m.loan.rateMin)) : null,
      topMatch: matches[0] || null,
    };
  }

  return summary;
}

// --- Helpers ---

function estimateAnnualIncome(profile) {
  const fi = profile.financialInfo || {};
  if (fi.total_income?.numericValue > 0) return fi.total_income.numericValue;
  if (fi.salary_gross?.numericValue > 0) return fi.salary_gross.numericValue * 12;
  if (fi.salary_net?.numericValue > 0) return fi.salary_net.numericValue * 12 * 1.3;
  return 0;
}

function detectWomanBorrower(profile) {
  const gender = profile.personalInfo?.gender?.value?.toLowerCase();
  return gender === 'female' || gender === 'f';
}

function detectSalaried(profile) {
  const docTypes = profile.documentTypes || [];
  return docTypes.includes('salary_slip');
}
