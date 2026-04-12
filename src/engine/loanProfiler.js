/**
 * Loan Profiler Engine
 * Builds an applicant profile from multiple documents and
 * generates a loan eligibility assessment with risk scoring.
 */

const LOAN_TYPES = {
  HOME_LOAN: {
    id: 'home_loan',
    label: 'Home Loan',
    minIncome: 300000, // annual
    maxEMIRatio: 0.5,
    requiredDocs: ['aadhaar', 'pan', 'bank_statement', 'salary_slip', 'itr', 'property_doc'],
    minDocs: ['aadhaar', 'pan', 'bank_statement'],
    interestRange: '8.5% - 10.5%',
    maxTenure: 30,
  },
  PERSONAL_LOAN: {
    id: 'personal_loan',
    label: 'Personal Loan',
    minIncome: 200000,
    maxEMIRatio: 0.4,
    requiredDocs: ['aadhaar', 'pan', 'bank_statement', 'salary_slip'],
    minDocs: ['aadhaar', 'pan'],
    interestRange: '10.5% - 18%',
    maxTenure: 7,
  },
  VEHICLE_LOAN: {
    id: 'vehicle_loan',
    label: 'Vehicle Loan',
    minIncome: 200000,
    maxEMIRatio: 0.35,
    requiredDocs: ['aadhaar', 'pan', 'bank_statement', 'salary_slip', 'driving_license'],
    minDocs: ['aadhaar', 'pan', 'bank_statement'],
    interestRange: '7.5% - 13%',
    maxTenure: 7,
  },
  EDUCATION_LOAN: {
    id: 'education_loan',
    label: 'Education Loan',
    minIncome: 150000,
    maxEMIRatio: 0.5,
    requiredDocs: ['aadhaar', 'pan', 'bank_statement', 'itr'],
    minDocs: ['aadhaar', 'pan'],
    interestRange: '8% - 12%',
    maxTenure: 15,
  },
  BUSINESS_LOAN: {
    id: 'business_loan',
    label: 'Business Loan',
    minIncome: 500000,
    maxEMIRatio: 0.45,
    requiredDocs: ['aadhaar', 'pan', 'bank_statement', 'itr'],
    minDocs: ['aadhaar', 'pan', 'bank_statement', 'itr'],
    interestRange: '11% - 20%',
    maxTenure: 10,
  },
};

/**
 * Build a unified applicant profile from processed documents
 */
export function buildApplicantProfile(processedDocuments) {
  const profile = {
    personalInfo: {},
    identityDocs: [],
    financialInfo: {},
    addressInfo: {},
    documents: [],
    completeness: 0,
    documentTypes: [],
  };

  for (const doc of processedDocuments) {
    const { classification, extraction } = doc;
    if (!classification || !extraction) continue;

    const docType = classification.bestMatch?.id;
    if (docType && docType !== 'unknown') {
      profile.documentTypes.push(docType);
      profile.documents.push({
        type: docType,
        label: classification.bestMatch.label,
        category: classification.bestMatch.category,
        confidence: classification.confidence,
        fileName: doc.fileName,
      });
    }

    // Merge extracted entities into profile
    const { entities } = extraction;
    for (const entity of entities) {
      switch (entity.category) {
        case 'personal':
          if (!profile.personalInfo[entity.key] || entity.confidence > 0.8) {
            profile.personalInfo[entity.key] = {
              value: entity.value,
              source: docType,
              confidence: entity.confidence,
            };
          }
          break;
        case 'identity':
          if (!profile.personalInfo[entity.key]) {
            profile.personalInfo[entity.key] = {
              value: entity.value,
              source: docType,
              confidence: entity.confidence,
            };
          }
          profile.identityDocs.push({
            type: entity.key,
            number: entity.value,
            source: docType,
          });
          break;
        case 'financial':
          profile.financialInfo[entity.key] = {
            value: entity.value,
            numericValue: parseFloat(entity.value.replace(/[₹,\s]/g, '')) || 0,
            source: docType,
            confidence: entity.confidence,
          };
          break;
        case 'address':
          profile.addressInfo[entity.key] = {
            value: entity.value,
            source: docType,
            confidence: entity.confidence,
          };
          break;
      }
    }
  }

  // Calculate profile completeness
  const essentialFields = ['name', 'aadhaar_number', 'pan_number', 'date_of_birth'];
  const presentFields = essentialFields.filter(f => profile.personalInfo[f]);
  const hasFinancial = Object.keys(profile.financialInfo).length > 0;
  const hasAddress = Object.keys(profile.addressInfo).length > 0;

  let completeness = (presentFields.length / essentialFields.length) * 60;
  if (hasFinancial) completeness += 25;
  if (hasAddress) completeness += 15;
  profile.completeness = Math.min(Math.round(completeness), 100);

  return profile;
}

/**
 * Assess loan eligibility based on applicant profile
 */
export function assessLoanEligibility(profile) {
  const assessments = [];

  for (const [key, loanType] of Object.entries(LOAN_TYPES)) {
    const assessment = {
      loanType: loanType,
      documentScore: 0,
      incomeScore: 0,
      overallScore: 0,
      status: 'incomplete',
      missingDocs: [],
      presentDocs: [],
      remarks: [],
      riskFlags: [],
    };

    // Document completeness check
    for (const reqDoc of loanType.requiredDocs) {
      if (profile.documentTypes.includes(reqDoc)) {
        assessment.presentDocs.push(reqDoc);
      } else {
        assessment.missingDocs.push(reqDoc);
      }
    }

    const minDocsMet = loanType.minDocs.every(d => profile.documentTypes.includes(d));
    assessment.documentScore = Math.round(
      (assessment.presentDocs.length / loanType.requiredDocs.length) * 100
    );

    // Income assessment
    const annualIncome = estimateAnnualIncome(profile.financialInfo);
    if (annualIncome > 0) {
      if (annualIncome >= loanType.minIncome) {
        assessment.incomeScore = Math.min(Math.round((annualIncome / loanType.minIncome) * 50), 100);
        assessment.remarks.push(`Estimated annual income: ₹${annualIncome.toLocaleString('en-IN')}`);
      } else {
        assessment.incomeScore = Math.round((annualIncome / loanType.minIncome) * 50);
        assessment.remarks.push(
          `Income (₹${annualIncome.toLocaleString('en-IN')}) below minimum requirement of ₹${loanType.minIncome.toLocaleString('en-IN')}`
        );
        assessment.riskFlags.push('Low income for loan type');
      }
    } else {
      assessment.remarks.push('Income data not available - upload salary slips or ITR');
    }

    // Identity verification check
    const hasAadhaar = profile.personalInfo.aadhaar_number;
    const hasPAN = profile.personalInfo.pan_number;
    if (hasAadhaar && hasPAN) {
      assessment.remarks.push('Both Aadhaar and PAN verified');
    } else {
      if (!hasAadhaar) assessment.riskFlags.push('Aadhaar not provided');
      if (!hasPAN) assessment.riskFlags.push('PAN not provided');
    }

    // Overall score
    assessment.overallScore = Math.round(
      (assessment.documentScore * 0.5) + (assessment.incomeScore * 0.5)
    );

    // Status determination
    if (assessment.overallScore >= 70 && minDocsMet) {
      assessment.status = 'eligible';
    } else if (assessment.overallScore >= 40 && minDocsMet) {
      assessment.status = 'conditional';
    } else if (assessment.documentScore > 0) {
      assessment.status = 'incomplete';
    } else {
      assessment.status = 'not_eligible';
    }

    assessments.push(assessment);
  }

  // Sort by overall score
  assessments.sort((a, b) => b.overallScore - a.overallScore);

  return {
    assessments,
    bestOption: assessments[0],
    profileStrength: profile.completeness,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Estimate annual income from financial data
 */
function estimateAnnualIncome(financialInfo) {
  if (financialInfo.total_income?.numericValue > 0) {
    return financialInfo.total_income.numericValue;
  }
  if (financialInfo.salary_gross?.numericValue > 0) {
    return financialInfo.salary_gross.numericValue * 12;
  }
  if (financialInfo.salary_net?.numericValue > 0) {
    return financialInfo.salary_net.numericValue * 12 * 1.3; // rough gross estimate
  }
  return 0;
}

/**
 * Generate a human-readable loan recommendation report
 */
export function generateReport(profile, eligibility) {
  const report = {
    applicantName: profile.personalInfo.name?.value || 'Unknown Applicant',
    profileCompleteness: profile.completeness,
    documentsProcessed: profile.documents.length,
    topRecommendation: null,
    allAssessments: eligibility.assessments,
    actionItems: [],
    generatedAt: new Date().toLocaleString('en-IN'),
  };

  // Top recommendation
  const best = eligibility.bestOption;
  if (best && best.status !== 'not_eligible') {
    report.topRecommendation = {
      loanType: best.loanType.label,
      score: best.overallScore,
      status: best.status,
      interestRange: best.loanType.interestRange,
      maxTenure: best.loanType.maxTenure,
    };
  }

  // Action items
  const allMissing = new Set();
  for (const a of eligibility.assessments) {
    for (const d of a.missingDocs) {
      allMissing.add(d);
    }
  }

  const docLabels = {
    aadhaar: 'Aadhaar Card',
    pan: 'PAN Card',
    bank_statement: 'Bank Statement (last 6 months)',
    salary_slip: 'Latest Salary Slip',
    itr: 'Income Tax Return (last 2 years)',
    property_doc: 'Property Documents',
    driving_license: 'Driving License',
    voter_id: 'Voter ID',
  };

  for (const doc of allMissing) {
    report.actionItems.push({
      type: 'missing_document',
      label: `Upload ${docLabels[doc] || doc}`,
      priority: ['aadhaar', 'pan', 'bank_statement', 'salary_slip'].includes(doc)
        ? 'high'
        : 'medium',
    });
  }

  if (!profile.personalInfo.name) {
    report.actionItems.push({
      type: 'data_quality',
      label: 'Name could not be extracted - please verify document quality',
      priority: 'high',
    });
  }

  return report;
}

export { LOAN_TYPES };
export default { buildApplicantProfile, assessLoanEligibility, generateReport };
