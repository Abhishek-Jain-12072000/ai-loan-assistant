import React, { useState, useMemo, useCallback } from 'react';
import { LOAN_TYPE_LABELS, LAST_UPDATED, calculateEMI, calculateTotalInterest } from '../data/bankData';
import { matchBanks } from '../engine/bankMatcher';

export default function BankMarketplace({ profile, eligibility, onBack }) {
  const [selectedLoanType, setSelectedLoanType] = useState('home_loan');
  const [loanAmount, setLoanAmount] = useState(2500000);
  const [loanTenure, setLoanTenure] = useState(20);
  const [bankTypeFilter, setBankTypeFilter] = useState('all');
  const [expandedBank, setExpandedBank] = useState(null);

  const loanTypes = Object.entries(LOAN_TYPE_LABELS);

  // Get matched banks
  const bankMatches = useMemo(() => {
    return matchBanks(selectedLoanType, profile, eligibility);
  }, [selectedLoanType, profile, eligibility]);

  // Apply filters
  const filteredBanks = useMemo(() => {
    let filtered = bankMatches;
    if (bankTypeFilter !== 'all') {
      filtered = filtered.filter(m => m.bank.type === bankTypeFilter);
    }
    return filtered;
  }, [bankMatches, bankTypeFilter]);

  // Default amounts per loan type
  const handleLoanTypeChange = useCallback((lt) => {
    setSelectedLoanType(lt);
    setExpandedBank(null);
    const defaults = {
      home_loan: { amount: 2500000, tenure: 20 },
      personal_loan: { amount: 500000, tenure: 3 },
      vehicle_loan: { amount: 800000, tenure: 5 },
      education_loan: { amount: 1000000, tenure: 7 },
      business_loan: { amount: 1500000, tenure: 5 },
    };
    const d = defaults[lt] || { amount: 1000000, tenure: 5 };
    setLoanAmount(d.amount);
    setLoanTenure(d.tenure);
  }, []);

  const formatCurrency = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const formatAmount = (val) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-slate-900">Bank Loan Marketplace</h2>
          <p className="text-slate-500 text-sm">Compare {filteredBanks.length} banks · Rates as of {LAST_UPDATED}</p>
        </div>
      </div>

      {/* Loan Type Tabs */}
      <div className="flex gap-2 flex-wrap">
        {loanTypes.map(([key, info]) => (
          <button
            key={key}
            onClick={() => handleLoanTypeChange(key)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              selectedLoanType === key
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
            }`}
          >
            <span>{info.icon}</span>
            <span>{info.label}</span>
          </button>
        ))}
      </div>

      {/* EMI Calculator Bar */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 className="font-semibold text-slate-900">EMI Calculator</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Loan Amount: {formatCurrency(loanAmount)}
            </label>
            <input
              type="range"
              min={100000}
              max={selectedLoanType === 'home_loan' ? 20000000 : selectedLoanType === 'personal_loan' ? 5000000 : 10000000}
              step={50000}
              value={loanAmount}
              onChange={e => setLoanAmount(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>₹1L</span>
              <span>{selectedLoanType === 'home_loan' ? '₹2Cr' : selectedLoanType === 'personal_loan' ? '₹50L' : '₹1Cr'}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Tenure: {loanTenure} year{loanTenure > 1 ? 's' : ''}
            </label>
            <input
              type="range"
              min={1}
              max={selectedLoanType === 'home_loan' ? 30 : selectedLoanType === 'education_loan' ? 15 : 7}
              step={1}
              value={loanTenure}
              onChange={e => setLoanTenure(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1 yr</span>
              <span>{selectedLoanType === 'home_loan' ? '30' : selectedLoanType === 'education_loan' ? '15' : '7'} yrs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-slate-500">Filter:</span>
        {['all', 'Public Sector', 'Private Sector', 'NBFC / HFC'].map(f => (
          <button
            key={f}
            onClick={() => setBankTypeFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              bankTypeFilter === f
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f === 'all' ? 'All Banks' : f}
          </button>
        ))}
        <span className="text-xs text-slate-400 ml-auto">{filteredBanks.length} banks found</span>
      </div>

      {/* Bank Cards */}
      <div className="space-y-3">
        {filteredBanks.map((match, index) => {
          const { bank, loan } = match;
          const emiMin = calculateEMI(loanAmount, loan.rateMin, loanTenure);
          const emiMax = calculateEMI(loanAmount, loan.rateMax, loanTenure);
          const totalInterestMin = calculateTotalInterest(loanAmount, loan.rateMin, loanTenure);
          const isExpanded = expandedBank === bank.id;

          return (
            <div
              key={bank.id}
              className={`glass-card overflow-hidden transition-all ${
                match.isBestMatch ? 'ring-2 ring-blue-500/30' : ''
              }`}
            >
              {/* Main row */}
              <div
                className="p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
                onClick={() => setExpandedBank(isExpanded ? null : bank.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Rank + Logo */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                      match.rank === 1 ? 'bg-amber-100 text-amber-700' :
                      match.rank === 2 ? 'bg-slate-200 text-slate-600' :
                      match.rank === 3 ? 'bg-orange-100 text-orange-600' :
                      'bg-slate-100 text-slate-400'
                    }`}>
                      #{match.rank}
                    </span>
                    <span className="text-2xl">{bank.logo}</span>
                  </div>

                  {/* Bank Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900">{bank.name}</h3>
                      {match.isBestMatch && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          Best Match
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">
                        {bank.type}
                      </span>
                    </div>

                    {/* Rate + EMI row */}
                    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 mt-2">
                      <div>
                        <span className="text-2xl font-bold text-blue-600">{loan.rateMin}%</span>
                        <span className="text-sm text-slate-400"> – {loan.rateMax}% p.a.</span>
                      </div>
                      <div className="text-sm text-slate-600">
                        EMI: <span className="font-semibold text-slate-900">{formatAmount(emiMin)}</span>
                        <span className="text-slate-400"> – {formatAmount(emiMax)}</span>
                        <span className="text-xs text-slate-400"> /month</span>
                      </div>
                    </div>

                    {/* Quick info chips */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        Max {loan.maxTenure} yrs
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        Up to ₹{loan.maxAmount >= 10000 ? (loan.maxAmount / 100).toFixed(0) + ' Cr' : loan.maxAmount + ' L'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        loan.processingFee.toLowerCase().includes('nil')
                          ? 'bg-green-50 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        Fee: {loan.processingFee.length > 30 ? loan.processingFee.substring(0, 30) + '...' : loan.processingFee}
                      </span>
                    </div>

                    {/* Reasons */}
                    {match.reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {match.reasons.slice(0, 2).map((r, i) => (
                          <span key={i} className="text-xs text-green-600">✓ {r}</span>
                        ))}
                      </div>
                    )}
                    {match.warnings.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {match.warnings.map((w, i) => (
                          <span key={i} className="text-xs text-amber-600">⚠ {w}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Expand Arrow */}
                  <div className="flex-shrink-0 self-center">
                    <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 space-y-4">
                  {/* EMI Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl p-3 border border-slate-200">
                      <p className="text-xs text-slate-500">Monthly EMI (at {loan.rateMin}%)</p>
                      <p className="text-lg font-bold text-blue-600">{formatAmount(emiMin)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-slate-200">
                      <p className="text-xs text-slate-500">Total Interest Payable</p>
                      <p className="text-lg font-bold text-slate-700">{formatCurrency(totalInterestMin)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-slate-200">
                      <p className="text-xs text-slate-500">Total Amount Payable</p>
                      <p className="text-lg font-bold text-slate-700">{formatCurrency(loanAmount + totalInterestMin)}</p>
                    </div>
                  </div>

                  {/* Features */}
                  {loan.features && loan.features.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Key Features</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {loan.features.map((feat, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-slate-600">
                            <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Match Score + CTA */}
                  <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">Match Score:</span>
                        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              match.score >= 70 ? 'bg-green-500' :
                              match.score >= 40 ? 'bg-amber-500' :
                              'bg-red-400'
                            }`}
                            style={{ width: `${match.score}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{match.score}%</span>
                      </div>
                    </div>
                    <a
                      href={loan.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.98]"
                    >
                      Visit {bank.shortName} Official
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No results */}
      {filteredBanks.length === 0 && (
        <div className="text-center py-12 glass-card">
          <p className="text-slate-500">No banks found for this loan type with current filters.</p>
          <button
            onClick={() => setBankTypeFilter('all')}
            className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Disclaimer */}
      <div className="glass-card p-4 bg-amber-50/50 border border-amber-200/50">
        <div className="flex gap-2">
          <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠</span>
          <div className="text-xs text-amber-700 space-y-1">
            <p className="font-semibold">Important Disclaimer</p>
            <p>
              Interest rates shown are indicative and sourced from public data as of {LAST_UPDATED}.
              Actual rates depend on your credit score, income, loan amount, and bank's discretion.
              Always verify rates on the bank's official website before applying.
              This tool does not constitute financial advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
