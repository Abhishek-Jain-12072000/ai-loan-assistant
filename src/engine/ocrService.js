/**
 * OCR Service - Tesseract.js wrapper with image preprocessing
 * Runs entirely in the browser - no server or API keys needed.
 */
import * as Tesseract from 'tesseract.js';

let worker = null;

export async function initOCR(onProgress) {
  if (worker) return worker;

  const workerFactory = Tesseract.createWorker || Tesseract.default?.createWorker;
  if (!workerFactory) throw new Error('Tesseract.js createWorker not found');

  worker = await workerFactory('eng', 1, {
    logger: (m) => {
      if (onProgress && m.status) {
        onProgress({
          status: m.status,
          progress: m.progress || 0,
        });
      }
    },
  });

  return worker;
}

/**
 * Preprocess image for better OCR - returns a base64 data URL
 * that Tesseract can reliably read.
 */
function preprocessImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Scale up small images (min 1500px wide)
          let scale = 1;
          if (img.width < 1500) {
            scale = Math.min(1500 / img.width, 3);
          }

          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);

          // Draw scaled image
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Get image data for pixel manipulation
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Grayscale + contrast boost
          for (let i = 0; i < data.length; i += 4) {
            let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            gray = ((gray / 255 - 0.5) * 1.5 + 0.5) * 255;
            gray = Math.max(0, Math.min(255, gray));
            if (gray > 200) gray = 255;
            if (gray < 55) gray = 0;
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
          }

          ctx.putImageData(imageData, 0, 0);

          // Return as data URL (base64) — this is what Tesseract can read
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        } catch (err) {
          console.warn('Preprocessing failed, using original:', err);
          resolve(e.target.result); // fallback to original data URL
        }
      };
      img.onerror = () => {
        resolve(e.target.result); // fallback
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      // Last resort: create object URL from file
      resolve(URL.createObjectURL(file));
    };
    reader.readAsDataURL(file);
  });
}

export async function performOCR(imageSource, onProgress) {
  const w = await initOCR(onProgress);

  // Preprocess image to data URL
  if (onProgress) onProgress({ status: 'Preprocessing image...', progress: 0 });
  const processedDataUrl = await preprocessImage(imageSource);

  // Run OCR on the data URL
  const result = await w.recognize(processedDataUrl);

  return {
    text: result.data.text,
    confidence: result.data.confidence,
    words: result.data.words?.length || 0,
    lines: result.data.lines?.length || 0,
  };
}

export async function terminateOCR() {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

export default { initOCR, performOCR, terminateOCR };