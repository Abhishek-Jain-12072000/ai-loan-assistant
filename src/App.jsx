import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import UploadZone from './components/UploadZone';
import ProcessingView from './components/ProcessingView';
import DocumentResults from './components/DocumentResults';
import LoanDashboard from './components/LoanDashboard';
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

  const processFiles = useCallback(async (uploadedFiles) => {
    setFiles(uploadedFiles);
    setStep(STEPS.PROCESSING);
    setProcessedDocs([]);

    const results = [];

    for (let i = 0; i < uploadedFiles.length; i++) {
      setCurrentFileIndex(i);
      const file = uploadedFiles[i];

      try {
        // Step 1: OCR
        setOcrProgress({ status: 'Performing OCR...', progress: 0 });
        const ocrResult = await performOCR(file, (p) => {
          setOcrProgress({ status: p.status, progress: p.progress });
        });

        // Step 2: Classify
        setOcrProgress({ status: 'Classifying document...', progress: 0.9 });
        const classification = classifyDocument(ocrResult.text);

        // Step 3: Extract entities
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

    // Step 4: Build profile & assess
    const applicantProfile = buildApplicantProfile(results);
    const loanEligibility = assessLoanEligibility(applicantProfile);
    const loanReport = generateReport(applicantProfile, loanEligibility);

    setProfile(applicantProfile);
    setEligibility(loanEligibility);
    setReport(loanReport);
    setStep(STEPS.RESULTS);
  }, []);

  const handleReset = useCallback(() => {
    // Revoke object URLs
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header step={step} onReset={handleReset} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {step === STEPS.UPLOAD && (
          <UploadZone onFilesSelected={processFiles} />
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
          <>
            <DocumentResults
              documents={processedDocs}
              profile={profile}
              onViewDashboard={() => setStep(STEPS.DASHBOARD)}
            />
          </>
        )}

        {step === STEPS.DASHBOARD && (
          <LoanDashboard
            profile={profile}
            eligibility={eligibility}
            report={report}
            documents={processedDocs}
            onBack={() => setStep(STEPS.RESULTS)}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
