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
  worker = await workerFactory('eng+hin', 1, {
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
 * Preprocess image for better OCR results using canvas
 * - Convert to grayscale
 * - Increase contrast
 * - Sharpen edges
 * - Scale up small images
 */
function preprocessImage(imageSource) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Scale up small images for better OCR (min 1500px wide)
        let scale = 1;
        if (img.width < 1500) {
          scale = 1500 / img.width;
        }
        // Cap at 3x to avoid memory issues
        scale = Math.min(scale, 3);

        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        // Draw scaled image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Get image data for pixel manipulation
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Convert to grayscale and increase contrast
        for (let i = 0; i < data.length; i += 4) {
          // Grayscale using luminosity method
          let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

          // Increase contrast (factor 1.5)
          gray = ((gray / 255 - 0.5) * 1.5 + 0.5) * 255;
          gray = Math.max(0, Math.min(255, gray));

          // Apply adaptive thresholding for very light/dark images
          // but keep grayscale for medium tones
          if (gray > 200) gray = 255;
          if (gray < 55) gray = 0;

          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }

        ctx.putImageData(imageData, 0, 0);

        // Return as blob for Tesseract
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(imageSource); // fallback to original
          }
        }, 'image/png');
      } catch (e) {
        console.warn('Preprocessing failed, using original:', e);
        resolve(imageSource); // fallback
      }
    };
    img.onerror = () => {
      resolve(imageSource); // fallback
    };

    // Handle different input types
    if (imageSource instanceof File || imageSource instanceof Blob) {
      img.src = URL.createObjectURL(imageSource);
    } else if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      resolve(imageSource);
    }
  });
}

export async function performOCR(imageSource, onProgress) {
  const w = await initOCR(onProgress);

  // Preprocess the image first
  if (onProgress) onProgress({ status: 'Preprocessing image...', progress: 0 });
  const processedImage = await preprocessImage(imageSource);

  // Run OCR on preprocessed image
  const result = await w.recognize(processedImage);

  // Also try original image if preprocessed result is poor
  let finalResult = result;
  if (result.data.confidence < 40 && imageSource !== processedImage) {
    if (onProgress) onProgress({ status: 'Retrying with original image...', progress: 0.5 });
    const origResult = await w.recognize(imageSource);
    if (origResult.data.confidence > result.data.confidence) {
      finalResult = origResult;
    }
  }

  return {
    text: finalResult.data.text,
    confidence: finalResult.data.confidence,
    words: finalResult.data.words?.length || 0,
    lines: finalResult.data.lines?.length || 0,
  };
}

export async function terminateOCR() {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

export default { initOCR, performOCR, terminateOCR };
