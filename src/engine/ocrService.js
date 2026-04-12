/**
 * OCR Service - Tesseract.js wrapper
 * Runs entirely in the browser - no server or API keys needed.
 */
import Tesseract from 'tesseract.js';

let worker = null;

export async function initOCR(onProgress) {
  if (worker) return worker;

  worker = await Tesseract.createWorker('eng+hin', 1, {
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

export async function performOCR(imageSource, onProgress) {
  const w = await initOCR(onProgress);
  const result = await w.recognize(imageSource);
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
