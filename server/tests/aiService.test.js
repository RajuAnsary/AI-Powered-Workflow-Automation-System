const fc = require('fast-check');

// Mock @google/generative-ai before requiring aiService
jest.mock('@google/generative-ai', () => {
  const mockGenerateContent = jest.fn();
  const mockGetGenerativeModel = jest.fn(() => ({ generateContent: mockGenerateContent }));
  const MockGoogleGenerativeAI = jest.fn(() => ({ getGenerativeModel: mockGetGenerativeModel }));
  return {
    GoogleGenerativeAI: MockGoogleGenerativeAI,
    _mockGenerateContent: mockGenerateContent,
  };
});

const { GoogleGenerativeAI, _mockGenerateContent } = require('@google/generative-ai');
const { extractData } = require('../services/aiService');

const VALID_RESPONSE = {
  extractedData: {
    date: '2024-01-15',
    shift: 'A',
    employeeNumber: 'EMP-001',
    machineNumber: 'MC-001',
    operationCode: 'OP-1',
    workOrderNumber: 'WO-001',
    quantityProduced: 100,
    timeTaken: '8h',
  },
  confidenceScores: {
    date: 0.95,
    shift: 0.98,
    employeeNumber: 0.85,
    machineNumber: 0.92,
    operationCode: 0.78,
    workOrderNumber: 0.91,
    quantityProduced: 0.88,
    timeTaken: 0.82,
  },
};

describe('aiService — unit tests', () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
  });

  test('throws OPENAI_KEY_MISSING when API key is absent', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(extractData('some text')).rejects.toMatchObject({ code: 'OPENAI_KEY_MISSING' });
  });

  test('throws OPENAI_KEY_MISSING when API key is empty string', async () => {
    process.env.GEMINI_API_KEY = '';
    await expect(extractData('some text')).rejects.toMatchObject({ code: 'OPENAI_KEY_MISSING' });
  });

  test('throws OPENAI_API_ERROR when Gemini API throws', async () => {
    _mockGenerateContent.mockRejectedValue(new Error('Network error'));
    await expect(extractData('some text')).rejects.toMatchObject({
      code: 'OPENAI_API_ERROR',
      status: 502,
    });
  });

  test('throws AI_PARSE_ERROR when response is not valid JSON', async () => {
    _mockGenerateContent.mockResolvedValue({
      response: { text: () => 'not valid json {{' },
    });
    await expect(extractData('some text')).rejects.toMatchObject({ code: 'AI_PARSE_ERROR' });
  });

  test('throws AI_PARSE_ERROR when response missing extractedData', async () => {
    _mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify({ confidenceScores: {} }) },
    });
    await expect(extractData('some text')).rejects.toMatchObject({ code: 'AI_PARSE_ERROR' });
  });

  test('returns correct shape on valid response', async () => {
    _mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify(VALID_RESPONSE) },
    });
    const result = await extractData('some text');
    expect(result).toHaveProperty('extractedData');
    expect(result).toHaveProperty('confidenceScores');
    expect(result.extractedData.shift).toBe('A');
  });

  test('strips markdown code fences from response', async () => {
    _mockGenerateContent.mockResolvedValue({
      response: { text: () => '```json\n' + JSON.stringify(VALID_RESPONSE) + '\n```' },
    });
    const result = await extractData('some text');
    expect(result.extractedData).toBeDefined();
  });
});

// ─── Property 4: AI Response Structure Completeness ──────────────────────────
// Tag: Feature: biztelai-workflow-automation, Property 4: AI Response Structure Completeness

const EIGHT_FIELDS = ['date', 'shift', 'employeeNumber', 'machineNumber', 'operationCode', 'workOrderNumber', 'quantityProduced', 'timeTaken'];

// Arbitrary for a valid score in [0, 1] — use integer steps to avoid float precision issues
const validScore = fc.integer({ min: 0, max: 100 }).map(n => n / 100);

describe('Property 4: AI Response Structure Completeness', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    jest.clearAllMocks();
  });

  test('returned object always has all 8 extractedData keys and valid confidenceScores', async () => {
    await fc.assert(
      fc.asyncProperty(
        // extractedData: all 8 fields with arbitrary values (string, number, or null)
        fc.record(
          Object.fromEntries(EIGHT_FIELDS.map(f => [
            f,
            fc.oneof(fc.string(), fc.integer({ min: 0, max: 9999 }), fc.constant(null)),
          ])),
        ),
        // confidenceScores: all 8 fields with values strictly in [0, 1]
        fc.record(
          Object.fromEntries(EIGHT_FIELDS.map(f => [f, validScore])),
        ),
        async (extractedData, confidenceScores) => {
          const mockResponse = { extractedData, confidenceScores };
          _mockGenerateContent.mockResolvedValue({
            response: { text: () => JSON.stringify(mockResponse) },
          });

          const result = await extractData('test');

          const hasAllExtracted = EIGHT_FIELDS.every(f => f in result.extractedData);
          const hasAllScores = EIGHT_FIELDS.every(f => f in result.confidenceScores);
          const scoresInRange = EIGHT_FIELDS.every(f => {
            const s = result.confidenceScores[f];
            return typeof s === 'number' && s >= 0 && s <= 1;
          });

          return hasAllExtracted && hasAllScores && scoresInRange;
        }
      ),
      { numRuns: 100 }
    );
  });
});
