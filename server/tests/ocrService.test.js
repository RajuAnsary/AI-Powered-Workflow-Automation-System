const fc = require('fast-check');

// Mock tesseract.js before requiring ocrService
jest.mock('tesseract.js', () => ({
  recognize: jest.fn(),
}));

const Tesseract = require('tesseract.js');
const { extractText } = require('../services/ocrService');

describe('ocrService — unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns text from a single image', async () => {
    Tesseract.recognize.mockResolvedValue({ data: { text: 'Hello World' } });
    const result = await extractText(['image1.png']);
    expect(result).toBe('Hello World');
  });

  test('concatenates multiple pages with separator', async () => {
    Tesseract.recognize
      .mockResolvedValueOnce({ data: { text: 'Page 1' } })
      .mockResolvedValueOnce({ data: { text: 'Page 2' } });
    const result = await extractText(['p1.png', 'p2.png']);
    expect(result).toBe('Page 1\n\n--- PAGE BREAK ---\n\nPage 2');
  });

  test('propagates Tesseract errors', async () => {
    Tesseract.recognize.mockRejectedValue(new Error('OCR failed'));
    await expect(extractText(['bad.png'])).rejects.toThrow('OCR failed');
  });

  test('returns empty string for empty input array', async () => {
    const result = await extractText([]);
    expect(result).toBe('');
  });
});

// ─── Property 2: OCR Multi-Page Concatenation Order ──────────────────────────
// Tag: Feature: biztelai-workflow-automation, Property 2: OCR Multi-Page Concatenation Order

describe('Property 2: OCR Multi-Page Concatenation Order', () => {
  test('output contains each page text in input order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
        async (pageTexts) => {
          Tesseract.recognize.mockReset();
          pageTexts.forEach(text => {
            Tesseract.recognize.mockResolvedValueOnce({ data: { text } });
          });

          const paths = pageTexts.map((_, i) => `page${i}.png`);
          const result = await extractText(paths);

          // Every page text must appear in the output
          const allPresent = pageTexts.every(text => result.includes(text));

          // Pages must appear in order
          let lastIndex = -1;
          const inOrder = pageTexts.every(text => {
            const idx = result.indexOf(text, lastIndex + 1);
            if (idx === -1) return false;
            lastIndex = idx;
            return true;
          });

          return allPresent && inOrder;
        }
      ),
      { numRuns: 100 }
    );
  });
});
