# LoanLens AI - Smart Indian Loan Document Processor

An AI-powered, browser-based document processing tool for Indian loan applications. Upload identity documents, financial records, and property papers — the AI categorizes them, extracts key data, and generates a loan eligibility profile.

**100% free. 100% private. Runs entirely in your browser.**

## Features

### Document Categorization
Automatically identifies 9+ Indian document types:
- **Identity**: Aadhaar Card, PAN Card, Voter ID, Passport, Driving License
- **Financial**: Bank Statements, Salary Slips, Income Tax Returns (ITR/Form 16)
- **Address Proof**: Utility Bills (Electricity, Water, Gas, Telephone)
- **Property**: Sale Deeds, Registration Documents, Encumbrance Certificates

### Entity Extraction
Pulls structured data from documents:
- Names, Father's Names, Date of Birth, Gender
- Aadhaar Number, PAN Number, Voter ID, Passport Number
- Bank Account Numbers, IFSC Codes
- Salary (Gross/Net), Total Income, Account Balance
- Addresses, PIN Codes

### Loan Eligibility Profiling
AI-generated assessment for 5 loan types:
- Home Loan
- Personal Loan
- Vehicle Loan
- Education Loan
- Business Loan

Each assessment includes document score, income score, risk flags, and missing document alerts.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| OCR Engine | Tesseract.js (browser-based) |
| Classification | Keyword matching + Pattern recognition |
| Entity Extraction | Regex patterns + Heuristic validation |
| Deployment | Vercel / Netlify |

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-loan-processor.git
cd ai-loan-processor

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Deploy to Vercel (Free)

### Option 1: One-Click Deploy
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project" and select your repo
4. Vercel auto-detects Vite — just click Deploy

### Option 2: Vercel CLI
```bash
npm i -g vercel
vercel
```

### Option 3: Netlify
```bash
npm run build
# Upload the `dist/` folder to Netlify Drop (https://app.netlify.com/drop)
```

## How It Works

```
┌──────────┐    ┌──────────────┐    ┌────────────────┐    ┌───────────────┐
│  Upload  │───>│  OCR Engine  │───>│  Classifier    │───>│  Entity       │
│  Images  │    │ (Tesseract)  │    │ (Pattern Match)│    │  Extractor    │
└──────────┘    └──────────────┘    └────────────────┘    └───────┬───────┘
                                                                  │
                ┌──────────────┐    ┌────────────────┐            │
                │  Loan Report │<───│  Eligibility   │<───────────┘
                │  Dashboard   │    │  Assessor      │
                └──────────────┘    └────────────────┘
```

1. **Upload**: User uploads document images (JPG, PNG, WebP)
2. **OCR**: Tesseract.js extracts text from images in the browser
3. **Classify**: Pattern matching + keyword scoring identifies document type
4. **Extract**: Regex patterns pull names, IDs, amounts, dates
5. **Profile**: Builds unified applicant profile from all documents
6. **Assess**: Scores eligibility across 5 loan types with risk flags

## Privacy & Security

- All processing happens in the browser using WebAssembly
- No document data is sent to any server
- No API keys required
- No backend infrastructure needed
- Works offline after initial load

## Supported Document Formats

| Format | Supported |
|--------|-----------|
| JPEG/JPG | Yes |
| PNG | Yes |
| WebP | Yes |
| BMP | Yes |
| TIFF | Yes |

For best results, upload clear, well-lit photos of documents.

## Project Structure

```
ai-loan-processor/
├── src/
│   ├── engine/
│   │   ├── documentClassifier.js   # Document type classification
│   │   ├── entityExtractor.js      # Named entity extraction
│   │   ├── loanProfiler.js         # Loan profiling & eligibility
│   │   └── ocrService.js           # Tesseract.js OCR wrapper
│   ├── components/
│   │   ├── Header.jsx              # App header with step indicator
│   │   ├── UploadZone.jsx          # Drag & drop upload interface
│   │   ├── ProcessingView.jsx      # OCR progress display
│   │   ├── DocumentResults.jsx     # Classification & extraction results
│   │   ├── LoanDashboard.jsx       # Loan eligibility dashboard
│   │   └── Footer.jsx              # App footer
│   ├── App.jsx                     # Main application component
│   ├── main.jsx                    # React entry point
│   └── index.css                   # Tailwind CSS + custom styles
├── vercel.json                     # Vercel deployment config
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built by [Abhishek Jain](https://github.com/Abhishek-Jain-12072000) & [Ritee Jain](https://github.com/RiteeJain14)· Made for India 🇮🇳

