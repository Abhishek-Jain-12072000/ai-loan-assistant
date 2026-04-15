import React, { useState } from 'react';

export default function LoanDashboard({ profile, eligibility, report, documents, onBack, onAddMore, onViewMarketplace }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!profile || !eligibility || !report) return null;

  const statusConfig = {
    eligible: { label: 'Eligible', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: '✓' },
    conditional: { label: 'Conditional', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '~' },
    incomplete: { label: 'Incomplete', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: '!' },
    not_eligible: { label: 'Not Eligible', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: '✗' },
  };

  return (
    <div className="space-y-6">
      {/* Back button & title */}
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-slate-900">Loan Eligibility Dashboard</h2>
          <p className="text-slate-500 text-sm">AI-generated assessment for {report.applicantName}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {onViewMarketplace && (
            <button
              onClick={onViewMarketplace}
              className="py-2.5 px-5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
              Compare Banks
            </button>
          )}
          {onAddMore && (
            <button
              onClick={onAddMore}
              className="py-2.5 px-5 bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-700 font-semibold rounded-xl transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Upload More
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'loans', label: 'Loan Assessment' },
          { key: 'profile', label: 'Applicant Profile' },
          { key: 'actions', label: 'Action Items' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Score Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <ScoreCard
              label="Profile Strength"
              value={`${report.profileCompleteness}%`}
              color={report.profileCompleteness >= 70 ? 'green' : report.profileCompleteness >= 40 ? 'amber' : 'red'}
              sub="Document completeness"
            />
            <ScoreCard
              label="Documents Processed"
              value={report.documentsProcessed}
              color="blue"
              sub={`${documents.filter(d => !d.error).length} successful`}
            />
            <ScoreCard
              label="Best Loan Match"
              value={report.topRecommendation?.loanType || 'N/A'}
              color="indigo"
              sub={report.topRecommendation ? `Score: ${report.topRecommendation.score}%` : 'Upload more docs'}
            />
            <ScoreCard
              label="Action Items"
              value={report.actionItems.length}
              color={report.actionItems.length > 3 ? 'red' : 'amber'}
              sub={`${report.actionItems.filter(a => a.priority === 'high').length} high priority`}
            />
          </div>

          {/* Top Recommendation */}
          {report.topRecommendation && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Top Recommendation</h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl font-bold text-blue-600">{report.topRecommendation.loanType}</span>
                    <span className={`badge-pill ${statusConfig[report.topRecommendation.status].bg} ${statusConfig[report.topRecommendation.status].text} border ${statusConfig[report.topRecommendation.status].border}`}>
                      {statusConfig[report.topRecommendation.status].label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                    <span>Interest: <strong>{report.topRecommendation.interestRange}</strong></span>
                    <span>Max Tenure: <strong>{report.topRecommendation.maxTenure} years</strong></span>
                    <span>Score: <strong>{report.topRecommendation.score}/100</strong></span>
                  </div>
                </div>
                <div className="w-20 h-20 relative">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke={report.topRecommendation.score >= 70 ? '#22c55e' : report.topRecommendation.score >= 40 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="3"
                      strokeDasharray={`${report.topRecommendation.score} ${100 - report.topRecommendation.score}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-slate-900">{report.topRecommendation.score}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Document Checklist */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Document Checklist</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'aadhaar', label: 'Aadhaar Card', required: true },
                { id: 'pan', label: 'PAN Card', required: true },
                { id: 'bank_statement', label: 'Bank Statement', required: true },
                { id: 'salary_slip', label: 'Salary Slip', required: true },
                { id: 'itr', label: 'Income Tax Return', required: true },
                { id: 'voter_id', label: 'Voter ID', required: false },
                { id: 'passport', label: 'Passport', required: false },
                { id: 'utility_bill', label: 'Utility Bill', required: false },
                { id: 'property_doc', label: 'Property Document', required: false },
              ].map(doc => {
                const isPresent = profile.documentTypes.includes(doc.id);
                return (
                  <div key={doc.id} className={`flex items-center gap-3 p-3 rounded-xl ${isPresent ? 'bg-green-50' : 'bg-slate-50'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isPresent ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'
                    }`}>
                      {isPresent ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm ${isPresent ? 'text-green-700 font-medium' : 'text-slate-600'}`}>
                      {doc.label}
                    </span>
                    {doc.required && !isPresent && (
                      <span className="badge-pill bg-red-50 text-red-600 text-[10px] ml-auto">Required</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Loans Tab */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          {eligibility.assessments.map((assessment, i) => {
            const sc = statusConfig[assessment.status];
            return (
              <div key={i} className="glass-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{assessment.loanType.label}</h3>
                    <span className={`badge-pill ${sc.bg} ${sc.text} border ${sc.border} mt-1`}>
                      {sc.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-slate-900">{assessment.overallScore}</p>
                    <p className="text-xs text-slate-500">/ 100</p>
                  </div>
                </div>

                {/* Score Bars */}
                <div className="space-y-3 mb-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">Document Score</span>
                      <span className="font-medium">{assessment.documentScore}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${assessment.documentScore}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">Income Score</span>
                      <span className="font-medium">{assessment.incomeScore}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="h-full rounded-full bg-green-500" style={{ width: `${assessment.incomeScore}%` }} />
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-3">
                  <span>Interest: <strong>{assessment.loanType.interestRange}</strong></span>
                  <span>Max Tenure: <strong>{assessment.loanType.maxTenure} yrs</strong></span>
                  <span>Min Income: <strong>₹{assessment.loanType.minIncome.toLocaleString('en-IN')}/yr</strong></span>
                </div>

                {/* Remarks */}
                {assessment.remarks.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {assessment.remarks.map((r, ri) => (
                      <p key={ri} className="text-xs text-slate-500 flex items-start gap-1.5">
                        <span className="text-blue-400 mt-0.5">&#8226;</span> {r}
                      </p>
                    ))}
                  </div>
                )}

                {/* Risk Flags */}
                {assessment.riskFlags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {assessment.riskFlags.map((flag, fi) => (
                      <span key={fi} className="badge-pill bg-red-50 text-red-600 border border-red-200">
                        {flag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Missing Docs */}
                {assessment.missingDocs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-2">Missing Documents:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {assessment.missingDocs.map((doc, di) => (
                        <span key={di} className="badge-pill bg-slate-100 text-slate-600">{doc}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Personal Info */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(profile.personalInfo).map(([key, info]) => (
                <ProfileField key={key} label={formatLabel(key)} value={info.value} source={info.source} confidence={info.confidence} />
              ))}
            </div>
          </div>

          {/* Financial Info */}
          {Object.keys(profile.financialInfo).length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Financial Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(profile.financialInfo).map(([key, info]) => (
                  <ProfileField key={key} label={formatLabel(key)} value={info.value} source={info.source} confidence={info.confidence} />
                ))}
              </div>
            </div>
          )}

          {/* Address Info */}
          {Object.keys(profile.addressInfo).length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Address Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(profile.addressInfo).map(([key, info]) => (
                  <ProfileField key={key} label={formatLabel(key)} value={info.value} source={info.source} confidence={info.confidence} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions Tab */}
      {activeTab === 'actions' && (
        <div className="space-y-4">
          {report.actionItems.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-50 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">All Clear!</h3>
              <p className="text-slate-500 mt-1">No pending action items. Your profile is well-documented.</p>
            </div>
          ) : (
            report.actionItems.map((item, i) => (
              <div key={i} className={`glass-card p-5 flex items-center gap-4 ${
                item.priority === 'high' ? 'border-l-4 border-l-red-400' : 'border-l-4 border-l-amber-400'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  item.priority === 'high' ? 'bg-red-50' : 'bg-amber-50'
                }`}>
                  <svg className={`w-5 h-5 ${item.priority === 'high' ? 'text-red-600' : 'text-amber-600'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Priority: <span className={item.priority === 'high' ? 'text-red-600 font-medium' : 'text-amber-600 font-medium'}>
                      {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                    </span>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="text-center py-4">
        <p className="text-xs text-slate-400 max-w-xl mx-auto">
          This assessment is AI-generated for informational purposes only and does not constitute financial advice.
          Actual loan eligibility depends on lender policies, credit score, and additional verification.
        </p>
      </div>
    </div>
  );
}

function ScoreCard({ label, value, color, sub }) {
  const colorMap = {
    green: 'from-green-500 to-emerald-600',
    amber: 'from-amber-500 to-orange-600',
    red: 'from-red-500 to-rose-600',
    blue: 'from-blue-500 to-cyan-600',
    indigo: 'from-indigo-500 to-purple-600',
  };

  return (
    <div className="glass-card p-5">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold bg-gradient-to-r ${colorMap[color]} bg-clip-text text-transparent`}>
        {value}
      </p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}

function ProfileField({ label, value, source, confidence }) {
  return (
    <div className="p-3 bg-slate-50 rounded-xl">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900 mt-0.5 break-all">{value}</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-slate-400">from: {source}</span>
        {confidence && (
          <span className={`text-[10px] ${confidence >= 0.8 ? 'text-green-500' : 'text-amber-500'}`}>
            {Math.round(confidence * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}

function formatLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
