const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Preprocess an image for better OCR accuracy on handwritten manufacturing sheets.
 * Steps: grayscale → normalize → sharpen → threshold → upscale
 *
 * @param {string} inputPath - path to original image
 * @returns {Promise<string>} path to preprocessed image
 */
async function preprocessImage(inputPath) {
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const dir = path.dirname(inputPath);
  const outputPath = path.join(dir, `${base}_processed.png`);

  try {
    const metadata = await sharp(inputPath).metadata();
    const { width = 1000, height = 800 } = metadata;

    // Scale up small images — Tesseract works best at ~300 DPI equivalent
    // Target: at least 2000px wide for A4-ish documents
    const scaleFactor = width < 2000 ? Math.min(3, Math.ceil(2000 / width)) : 1;

    await sharp(inputPath)
      // 1. Convert to grayscale
      .grayscale()
      // 2. Normalize contrast (stretch histogram to full 0-255 range)
      .normalize()
      // 3. Increase contrast further with linear adjustment
      .linear(1.4, -20)
      // 4. Sharpen to make text edges crisper
      .sharpen({ sigma: 1.5, m1: 1.5, m2: 0.7 })
      // 5. Upscale if needed (Lanczos for quality)
      .resize(
        Math.round(width * scaleFactor),
        Math.round(height * scaleFactor),
        { kernel: sharp.kernel.lanczos3 }
      )
      // 6. Apply threshold to binarize (black text on white background)
      // threshold(128) = pixels > 128 become white, rest black
      .threshold(140)
      // 7. Save as PNG (lossless, best for OCR)
      .png({ compressionLevel: 1 })
      .toFile(outputPath);

    return outputPath;
  } catch (err) {
    // If preprocessing fails, return original path as fallback
    console.warn(`Image preprocessing failed for ${inputPath}: ${err.message}. Using original.`);
    return inputPath;
  }
}

/**
 * Clean up preprocessed image file after OCR is done.
 * @param {string} processedPath
 * @param {string} originalPath
 */
function cleanupProcessed(processedPath, originalPath) {
  if (processedPath !== originalPath && fs.existsSync(processedPath)) {
    try { fs.unlinkSync(processedPath); } catch (_) {}
  }
}

module.exports = { preprocessImage, cleanupProcessed };
