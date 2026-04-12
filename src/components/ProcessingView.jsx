import React from 'react';

export default function ProcessingView({ files, currentIndex, progress, processedDocs }) {
  const totalFiles = files.length;
  const overallProgress = ((currentIndex + progress.progress) / totalFiles) * 100;

  const statusLabels = {
    'loading tesseract core': 'Loading OCR engine...',
    'initializing tesseract': 'Initializing OCR...',
    'loading language traineddata': 'Loading language data...',
    'initializing api': 'Starting recognition...',
    'recognizing text': 'Reading document text...',
    'Classifying document...': 'Classifying document type...',
    'Extracting entities...': 'Extracting data entities...',
  };

  const displayStatus = statusLabels[progress.status] || progress.status || 'Preparing...';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Processing Documents</h2>
        <p className="text-slate-500 mt-1">AI is analyzing your documents - this runs entirely in your browser</p>
      </div>

      {/* Overall Progress */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Overall Progress</span>
          <span className="text-sm font-mono text-blue-600">{Math.round(overallProgress)}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full shimmer transition-all duration-300"
            style={{ width: `${Math.max(overallProgress, 2)}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Document {currentIndex + 1} of {totalFiles}
        </p>
      </div>

      {/* Current File */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {files[currentIndex]?.name}
            </p>
            <p className="text-xs text-blue-600 mt-1">{displayStatus}</p>
            {progress.progress > 0 && progress.progress < 1 && (
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress.progress * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Completed Files */}
      {processedDocs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-600">Completed</h3>
          {processedDocs.map((doc, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 truncate">{doc.fileName}</p>
              </div>
              {doc.classification?.bestMatch && (
                <span className="badge-pill bg-blue-50 text-blue-700">
                  {doc.classification.bestMatch.label}
                </span>
              )}
              {doc.error && (
                <span className="badge-pill bg-red-50 text-red-700">Error</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
