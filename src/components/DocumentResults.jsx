import React, { useState } from 'react';

export default function DocumentResults({ documents, profile, onViewDashboard, onAddMore }) {
  const [expandedDoc, setExpandedDoc] = useState(0);

  const categoryColors = {
    identity: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    financial: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    address_proof: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    property: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    other: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  };

  const confidenceColor = (conf) => {
    if (conf >= 0.8) return 'text-green-600';
    if (conf >= 0.5) return 'text-amber-600';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Document Analysis Results</h2>
          <p className="text-slate-500 mt-1">
            {documents.length} document{documents.length > 1 ? 's' : ''} processed successfully
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddMore}
            className="py-2.5 px-5 bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 text-slate-700 font-semibold rounded-xl transition-all active:scale-[0.98] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Upload More Documents
          </button>
          <button
            onClick={onViewDashboard}
            className="py-2.5 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            View Loan Dashboard
          </button>
        </div>
      </div>

      {/* Profile Summary Bar */}
      {profile && (
        <div className="glass-card p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-slate-500">Applicant</p>
              <p className="text-sm font-semibold text-slate-900">
                {profile.personalInfo.name?.value || 'Unknown'}
              </p>
            </div>
          </div>

          {profile.personalInfo.pan_number && (
            <div>
              <p className="text-xs text-slate-500">PAN</p>
              <p className="text-sm font-mono font-medium text-slate-700">{profile.personalInfo.pan_number.value}</p>
            </div>
          )}

          {profile.personalInfo.aadhaar_number && (
            <div>
              <p className="text-xs text-slate-500">Aadhaar</p>
              <p className="text-sm font-mono font-medium text-slate-700">{profile.personalInfo.aadhaar_number.value}</p>
            </div>
          )}

          <div className="ml-auto">
            <p className="text-xs text-slate-500">Profile Completeness</p>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-slate-100 rounded-full h-2">
                <div
                  className={`h-full rounded-full transition-all ${profile.completeness >= 70 ? 'bg-green-500' : profile.completeness >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${profile.completeness}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-slate-700">{profile.completeness}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Document Cards */}
      <div className="space-y-4">
        {documents.map((doc, index) => {
          const isExpanded = expandedDoc === index;
          const classification = doc.classification;
          const extraction = doc.extraction;
          const docCategory = classification?.bestMatch?.category || 'other';
          const colors = categoryColors[docCategory] || categoryColors.other;

          return (
            <div key={index} className="glass-card overflow-hidden">
              {/* Document Header */}
              <button
                onClick={() => setExpandedDoc(isExpanded ? -1 : index)}
                className="w-full p-5 flex items-center gap-4 text-left hover:bg-slate-50/50 transition-colors"
              >
                {/* Preview thumbnail */}
                {doc.preview && (
                  <img
                    src={doc.preview}
                    alt={doc.fileName}
                    className="w-14 h-14 object-cover rounded-xl border border-slate-200"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{doc.fileName}</h3>
                    {doc.error && <span className="badge-pill bg-red-50 text-red-600">Error</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {classification?.bestMatch && classification.bestMatch.id !== 'unknown' && (
                      <span className={`badge-pill ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {classification.bestMatch.label}
                      </span>
                    )}
                    {classification?.confidence > 0 && (
                      <span className={`text-xs font-medium ${confidenceColor(classification.confidence)}`}>
                        {Math.round(classification.confidence * 100)}% confidence
                      </span>
                    )}
                    {extraction?.entities?.length > 0 && (
                      <span className="text-xs text-slate-500">
                        {extraction.entities.length} entities extracted
                      </span>
                    )}
                  </div>
                </div>

                <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-slate-100 p-5 space-y-4">
                  {/* Extracted Entities */}
                  {extraction?.entities?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Extracted Data</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {extraction.entities.map((entity, ei) => (
                          <div key={ei} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                              entity.category === 'identity' ? 'bg-orange-400' :
                              entity.category === 'financial' ? 'bg-green-400' :
                              entity.category === 'personal' ? 'bg-blue-400' : 'bg-purple-400'
                            }`} />
                            <div className="min-w-0">
                              <p className="text-xs text-slate-500">{entity.label}</p>
                              <p className="text-sm font-medium text-slate-900 break-all">{entity.value}</p>
                              <p className={`text-xs mt-0.5 ${confidenceColor(entity.confidence)}`}>
                                {Math.round(entity.confidence * 100)}% confidence
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Classification Scores */}
                  {classification?.scores?.length > 1 && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Classification Scores</h4>
                      <div className="space-y-2">
                        {classification.scores.slice(0, 3).map((s, si) => (
                          <div key={si} className="flex items-center gap-3">
                            <span className="text-xs text-slate-600 w-32 truncate">{s.docType.label}</span>
                            <div className="flex-1 bg-slate-100 rounded-full h-2">
                              <div
                                className={`h-full rounded-full ${si === 0 ? 'bg-blue-500' : 'bg-slate-300'}`}
                                style={{ width: `${s.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-slate-500 w-10 text-right">
                              {Math.round(s.confidence * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* OCR Stats */}
                  {doc.ocr && (
                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <span>OCR Confidence: {Math.round(doc.ocr.confidence)}%</span>
                      <span>{doc.ocr.words} words detected</span>
                      <span>{doc.ocr.lines} lines</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
