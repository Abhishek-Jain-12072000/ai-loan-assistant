import React, { useState, useRef, useCallback } from 'react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'];
const MAX_FILES = 10;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export default function UploadZone({ onFilesSelected, existingCount = 0 }) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const validateFiles = useCallback((fileList) => {
    const validFiles = [];
    for (const file of fileList) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(`${file.name}: Unsupported format. Use JPG, PNG, or WebP.`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        setError(`${file.name}: File too large. Maximum 10MB.`);
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length + selectedFiles.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed.`);
      return validFiles.slice(0, MAX_FILES - selectedFiles.length);
    }
    return validFiles;
  }, [selectedFiles]);

  const handleFiles = useCallback((fileList) => {
    setError('');
    const valid = validateFiles(Array.from(fileList));
    if (valid.length > 0) {
      setSelectedFiles(prev => [...prev, ...valid]);
    }
  }, [validateFiles]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeFile = useCallback((index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleProcess = () => {
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-3">
          {existingCount > 0 ? 'Add More Documents' : 'AI-Powered Loan Document Processing'}
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          {existingCount > 0
            ? `You already have ${existingCount} document${existingCount > 1 ? 's' : ''} processed. Upload additional documents to enhance your loan profile.`
            : 'Upload your Indian identity documents, financial records, and property papers. Our AI will categorize, extract data, and build your loan profile automatically.'}
        </p>
      </div>

      {/* Supported Documents */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {['Aadhaar', 'PAN Card', 'Bank Statement', 'Salary Slip', 'ITR', 'Voter ID', 'Passport', 'Utility Bill', 'Property Doc'].map(doc => (
          <span key={doc} className="badge-pill bg-blue-50 text-blue-700 border border-blue-200">
            {doc}
          </span>
        ))}
      </div>

      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
          ${isDragging ? 'border-blue-500 bg-blue-50 upload-zone-active' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors
            ${isDragging ? 'bg-blue-100' : 'bg-slate-100'}`}>
            <svg className={`w-8 h-8 ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-700">
              {isDragging ? 'Drop your documents here' : 'Drag & drop document images'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              or click to browse | JPG, PNG, WebP up to 10MB | Max {MAX_FILES} files
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">
              Selected Documents ({selectedFiles.length})
            </h3>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-sm text-slate-500 hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          </div>

          <div className="grid gap-3">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                  onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleProcess}
            className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98]"
          >
            Process {selectedFiles.length} Document{selectedFiles.length > 1 ? 's' : ''} with AI
          </button>
        </div>
      )}

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
        <FeatureCard
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
          title="Auto-Categorize"
          desc="Identifies Aadhaar, PAN, Bank Statements, and 9+ Indian document types"
        />
        <FeatureCard
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>}
          title="Entity Extraction"
          desc="Pulls names, ID numbers, dates, amounts, addresses automatically"
        />
        <FeatureCard
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
          title="Loan Profiling"
          desc="AI assesses eligibility for Home, Personal, Vehicle, Education & Business loans"
        />
      </div>

      {/* Privacy Notice */}
      <div className="text-center mt-6">
        <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          100% browser-based processing. Your documents never leave your device.
        </p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="glass-card p-5">
      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 text-sm mb-1">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}
