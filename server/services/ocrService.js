const Tesseract = require('tesseract.js');
const { preprocessImage, cleanupProcessed } = require('./imagePreprocessor');

/**
 * Extract text from one or more image paths using Tesseract OCR.
 * Applies image preprocessing before OCR for better accuracy on
 * handwritten manufacturing documents.
 *
 * @param {string[]} imagePaths
 * @returns {Promise<string>}
 */
async function extractText(imagePaths) {
  const results = [];

  for (const imagePath of imagePaths) {
    // Preprocess image: grayscale → normalize → sharpen → threshold → upscale
    const processedPath = await preprocessImage(imagePath);

    try {
      // Run OCR with multiple PSM modes and pick the best result
      const [result6, result4] = await Promise.all([
        // PSM 6: single uniform block of text (good for tables)
        Tesseract.recognize(processedPath, 'eng', {
          logger: () => {},
          tessedit_pageseg_mode: '6',
          tessedit_ocr_engine_mode: '1', // LSTM only
          preserve_interword_spaces: '1',
        }),
        // PSM 4: single column of text (good for columnar data)
        Tesseract.recognize(processedPath, 'eng', {
          logger: () => {},
          tessedit_pageseg_mode: '4',
          tessedit_ocr_engine_mode: '1',
          preserve_interword_spaces: '1',
        }),
      ]);

      const text6 = result6.data.text.trim();
      const text4 = result4.data.text.trim();

      // Pick the result with more recognizable content
      // Heuristic: more alphanumeric tokens = better OCR
      const score = (t) => (t.match(/[A-Za-z0-9]{2,}/g) || []).length;
      const bestText = score(text6) >= score(text4) ? text6 : text4;

      results.push(bestText);
    } finally {
      cleanupProcessed(processedPath, imagePath);
    }
  }

  return results.join('\n\n--- PAGE BREAK ---\n\n');
}

module.exports = { extractText };
