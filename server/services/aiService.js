const Groq = require('groq-sdk');
const { extractHeuristicRows, normalizeMachineNumber } = require('./heuristicExtractor');

const SYSTEM_PROMPT = `You are an expert data extraction assistant for manufacturing operational documents.
You will receive OCR text from a handwritten manufacturing table sheet.

The table has these columns:
S.No | Date | Shift | Emp.No | Opn Code | Machine No. | Work Order No. | Qty.Prod. | Time taken (in hrs)

IMPORTANT: The table may have MULTIPLE data rows. Extract ALL rows that have data.

Return a JSON object with a "records" array. Each element represents one table row:
{
  "records": [
    {
      "rowNumber": 1,
      "extractedData": {
        "date": "20/4/26",
        "shift": "I",
        "employeeNumber": "BT4710",
        "machineNumber": "MC-730",
        "operationCode": "856430",
        "workOrderNumber": "165460",
        "quantityProduced": 25,
        "timeTaken": "4.0"
      },
      "confidenceScores": {
        "date": 0.9, "shift": 0.95, "employeeNumber": 0.9,
        "machineNumber": 0.9, "operationCode": 0.85,
        "workOrderNumber": 0.85, "quantityProduced": 0.9, "timeTaken": 0.9
      }
    }
  ]
}

FIELD RULES:
- date: DD/MM/YY format (e.g. "20/4/26", "20/4/26")
- shift: Keep as Roman numeral — I, II, or III. Convert 1→I, 2→II, 3→III, A→I, B→II, C→III
- employeeNumber: e.g. BT4710, BT4720 (letters + digits, no spaces)
- machineNumber: MUST be MC-XXX format. Normalize: MC-730, MC-780, MC-850
- operationCode: 6-digit number starting with 8 (e.g. 856430, 856460, 856470)
- workOrderNumber: 6-digit number (e.g. 165460, 601200)
- quantityProduced: NUMBER (e.g. 25, 37, 28)
- timeTaken: string (e.g. "4.0", "8.0", "7.5")

CRITICAL RULES:
1. Extract EVERY row that has data — do not stop at the first row
2. Skip empty rows (rows 4-10 in the table are blank)
3. Use null only if a value is truly unreadable
4. OCR may garble characters — use context to infer correct values
5. Return ONLY the JSON object, no markdown`;

const SHIFT_NORMALIZE = { 'A': 'I', 'B': 'II', 'C': 'III', '1': 'I', '2': 'II', '3': 'III', 'I': 'I', 'II': 'II', 'III': 'III' };

/**
 * Extract ALL rows from OCR text as an array of records.
 * @param {string} ocrText
 * @returns {Promise<Array<{rowNumber, extractedData, confidenceScores}>>}
 */
async function extractAllRows(ocrText) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const err = new Error('GROQ_API_KEY is not configured');
    err.status = 500;
    err.code = 'OPENAI_KEY_MISSING';
    throw err;
  }

  // Heuristic pre-extraction for all rows
  const heuristicRows = extractHeuristicRows(ocrText);
  const heuristicSummary = JSON.stringify(heuristicRows, null, 2);

  const userMessage = `OCR TEXT from manufacturing table (may be garbled):
\`\`\`
${ocrText}
\`\`\`

HEURISTIC PRE-EXTRACTION (regex found these rows — use as strong hints):
\`\`\`json
${heuristicSummary}
\`\`\`

Extract ALL data rows from the table. The heuristic found ${heuristicRows.length} row(s).
Return all rows as a JSON "records" array.`;

  let result;
  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.05,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    });
    result = completion.choices[0].message.content;
  } catch (apiErr) {
    console.warn('AI extraction failed, using heuristic fallback:', apiErr.message);
    return buildFallbackRows(heuristicRows);
  }

  let parsed;
  try {
    const cleaned = result.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    console.warn('AI parse failed, using heuristic fallback');
    return buildFallbackRows(heuristicRows);
  }

  if (!parsed.records || !Array.isArray(parsed.records)) {
    // Maybe AI returned single record format — wrap it
    if (parsed.extractedData) {
      parsed = { records: [{ rowNumber: 1, extractedData: parsed.extractedData, confidenceScores: parsed.confidenceScores || {} }] };
    } else {
      return buildFallbackRows(heuristicRows);
    }
  }

  // Normalize each row
  return parsed.records.map((row, i) => {
    const data = row.extractedData || {};
    const scores = row.confidenceScores || {};

    // Normalize machineNumber
    if (data.machineNumber) data.machineNumber = normalizeMachineNumber(data.machineNumber);

    // Normalize shift to Roman numeral
    if (data.shift) {
      const s = String(data.shift).trim().toUpperCase();
      data.shift = SHIFT_NORMALIZE[s] || data.shift;
    }

    // Ensure quantityProduced is a number
    if (data.quantityProduced !== null && data.quantityProduced !== undefined) {
      const n = parseFloat(data.quantityProduced);
      data.quantityProduced = isNaN(n) ? null : n;
    }

    // Merge heuristic values for any null AI fields
    const hRow = heuristicRows[i];
    if (hRow) {
      const fields = ['date', 'shift', 'employeeNumber', 'machineNumber', 'operationCode', 'workOrderNumber', 'quantityProduced', 'timeTaken'];
      for (const f of fields) {
        if ((data[f] === null || data[f] === undefined) && hRow[f] !== null) {
          data[f] = hRow[f];
          scores[f] = 0.5;
        }
      }
    }

    return {
      rowNumber: row.rowNumber || i + 1,
      extractedData: data,
      confidenceScores: scores,
    };
  });
}

// Keep backward-compatible single-record function
async function extractData(ocrText) {
  const rows = await extractAllRows(ocrText);
  if (rows.length === 0) return { extractedData: {}, confidenceScores: {} };
  return { extractedData: rows[0].extractedData, confidenceScores: rows[0].confidenceScores };
}

function buildFallbackRows(heuristicRows) {
  const fields = ['date', 'shift', 'employeeNumber', 'machineNumber', 'operationCode', 'workOrderNumber', 'quantityProduced', 'timeTaken'];
  return heuristicRows.map((row, i) => ({
    rowNumber: i + 1,
    extractedData: row,
    confidenceScores: Object.fromEntries(fields.map(f => [f, row[f] !== null ? 0.5 : 0.0])),
  }));
}

module.exports = { extractData, extractAllRows };
