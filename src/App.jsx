import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import UploadZone from './components/UploadZone';
import ProcessingView from './components/ProcessingView';
import DocumentResults from './components/DocumentResults';
import LoanDashboard from './components/LoanDashboard';
import BankMarketplace from './components/BankMarketplace';
import Footer from './components/Footer';
import { performOCR } from './engine/ocrService';
import { classifyDocument } from './engine/documentClassifier';
import { extractEntities } from './engine/entityExtractor';
import { buildApplicantProfile, assessLoanEligibility, generateReport } from './engine/loanProfiler';

const STEPS = {
  UPLOAD: 'upload',
  PROCESSING: 'processing',
  RESULTS: 'results',
  DASHBOARD: 'dashboard',
  MARKETPLACE: 'marketplace',
};

export default function App() {
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [files, setFiles] = useState([]);
  const [processedDocs, setProcessedDocs] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [ocrProgress, setOcrProgress] = useState({ status: '', progress: 0 });
  const [profile, setProfile] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [report, setReport] = useState(null);

  const processFiles = useCallback(async (uploadedFiles, appendMode = false) => {
    setFiles(uploadedFiles);
    setStep(STEPS.PROCESSING);

    const existingDocs = appendMode ? [...processedDocs] : [];
    const results = [...existingDocs];
    setProcessedDocs(results);

    for (let i = 0; i < uploadedFiles.length; i++) {
      setCurrentFileIndex(i);
      const file = uploadedFiles[i];

      try {
        setOcrProgress({ status: 'Performing OCR...', progress: 0 });
        const ocrResult = await performOCR(file, (p) => {
          setOcrProgress({ status: p.status, progress: p.progress });
        });

        setOcrProgress({ status: 'Classifying document...', progress: 0.9 });
        const classification = classifyDocument(ocrResult.text, file.name);

        setOcrProgress({ status: 'Extracting entities...', progress: 0.95 });
        const extraction = extractEntities(ocrResult.text, classification.bestMatch?.id);

        const processed = {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          preview: URL.createObjectURL(file),
          ocr: ocrResult,
          classification,
          extraction,
          timestamp: new Date().toISOString(),
        };

        results.push(processed);
        setProcessedDocs([...results]);
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
        results.push({
          fileName: file.name,
          error: err.message,
          timestamp: new Date().toISOString(),
        });
        setProcessedDocs([...results]);
      }
    }

    const applicantProfile = buildApplicantProfile(results);
    const loanEligibility = assessLoanEligibility(applicantProfile);
    const loanReport = generateReport(applicantProfile, loanEligibility);

    setProfile(applicantProfile);
    setEligibility(loanEligibility);
    setReport(loanReport);
    setStep(STEPS.RESULTS);
  }, [processedDocs]);

  const handleAddMore = useCallback(() => {
    setStep(STEPS.UPLOAD);
  }, []);

  const handleAddMoreFiles = useCallback((newFiles) => {
    processFiles(newFiles, true);
  }, [processFiles]);

  const handleReset = useCallback(() => {
    processedDocs.forEach(doc => {
      if (doc.preview) URL.revokeObjectURL(doc.preview);
    });
    setStep(STEPS.UPLOAD);
    setFiles([]);
    setProcessedDocs([]);
    setProfile(null);
    setEligibility(null);
    setReport(null);
    setCurrentFileIndex(0);
  }, [processedDocs]);

  const hasExistingDocs = processedDocs.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header step={step} onReset={handleReset} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {step === STEPS.UPLOAD && (
          <UploadZone
            onFilesSelected={hasExistingDocs ? handleAddMoreFiles : processFiles}
            existingCount={processedDocs.length}
          />
        )}

        {step === STEPS.PROCESSING && (
          <ProcessingView
            files={files}
            currentIndex={currentFileIndex}
            progress={ocrProgress}
            processedDocs={processedDocs}
          />
        )}

        {step === STEPS.RESULTS && (
          <DocumentResults
            documents={processedDocs}
            profile={profile}
            onViewDashboard={() => setStep(STEPS.DASHBOARD)}
            onAddMore={handleAddMore}
          />
        )}

        {step === STEPS.DASHBOARD && (
          <LoanDashboard
            profile={profile}
            eligibility={eligibility}
            report={report}
            documents={processedDocs}
            onBack={() => setStep(STEPS.RESULTS)}
            onAddMore={handleAddMore}
            onViewMarketplace={() => setStep(STEPS.MARKETPLACE)}
          />
        )}

        {step === STEPS.MARKETPLACE && (
          <BankMarketplace
            profile={profile}
            eligibility={eligibility}
            onBack={() => setStep(STEPS.DASHBOARD)}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
