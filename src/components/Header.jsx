import React from 'react';

export default function Header({ step, onReset }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">LoanLens AI</h1>
              <p className="text-xs text-slate-500">Smart Indian Loan Document Processor</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Step indicator */}
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <StepDot active={step === 'upload'} done={['processing','results','dashboard'].includes(step)} label="Upload" />
              <StepLine done={['processing','results','dashboard'].includes(step)} />
              <StepDot active={step === 'processing'} done={['results','dashboard'].includes(step)} label="Process" />
              <StepLine done={['results','dashboard'].includes(step)} />
              <StepDot active={step === 'results'} done={['dashboard'].includes(step)} label="Extract" />
              <StepLine done={step === 'dashboard'} />
              <StepDot active={step === 'dashboard'} done={false} label="Profile" />
            </div>

            {step !== 'upload' && (
              <button
                onClick={onReset}
                className="text-sm text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                New Session
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function StepDot({ active, done, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-2.5 h-2.5 rounded-full transition-all ${
        active ? 'bg-blue-600 ring-4 ring-blue-100' :
        done ? 'bg-green-500' : 'bg-slate-300'
      }`} />
      <span className={`${active ? 'text-blue-600 font-medium' : done ? 'text-green-600' : 'text-slate-400'}`}>
        {label}
      </span>
    </div>
  );
}

function StepLine({ done }) {
  return (
    <div className={`w-8 h-0.5 mb-4 ${done ? 'bg-green-400' : 'bg-slate-200'}`} />
  );
}
