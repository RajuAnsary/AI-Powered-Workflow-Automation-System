'use strict';
/**
 * Heuristic extraction — parses ALL data rows from manufacturing table OCR text.
 * Column order: S.No | Date | Shift | Emp.No | Opn Code | Machine No. | Work Order No. | Qty | Time
 */

const SHIFT_MAP = {
  'I': 'I', 'II': 'II', 'III': 'III',
  '1': 'I', '2': 'II', '3': 'III',
  'A': 'I', 'B': 'II', 'C': 'III',
};

function normalizeMachineNumber(raw) {
  if (!raw) return raw;
  const cleaned = raw.replace(/\s+/g, '').toUpperCase().replace(/^I(?=MC)/i, '');
  const match = cleaned.match(/^M[CL][-\s]?(\d{3,4})$/i);
  if (match) return `MC-${match[1]}`;
  const match2 = cleaned.match(/^MC[-\s]?(\d{3,4})$/i);
  if (match2) return `MC-${match2[1]}`;
  return raw.trim();
}

function extractAllNumbers(text) {
  const numbers = [];
  for (const m of text.matchAll(/\b(\d+(?:\.\d+)?)\b/g)) {
    numbers.push({ value: m[1], index: m.index });
  }
  return numbers;
}

/**
 * Detect all data rows from OCR text.
 * A data row is a line that contains a date pattern OR multiple codes/numbers.
 */
function detectDataRows(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const dataRows = [];

  for (const line of lines) {
    // Skip header lines
    if (/^(s\.?\s*no|machine\s*shop|date\s+shift|s\s+no)/i.test(line)) continue;
    if (/^(s\.?\s*no|date|shift|emp|machine|work\s*order|qty|time\s*taken)/i.test(line) &&
        !/\d{5,}/.test(line) && !/\d{1,2}[\/\-]/.test(line)) continue;

    const tokens = line.split(/[\s|]+/).filter(Boolean);
    const hasDate = /\d{1,2}[\/\-\.]\d{1,2}/.test(line);
    const hasLongNum = /\b\d{5,}\b/.test(line);
    const hasCodes = tokens.some(t => /^[A-Z]{1,3}\d{3,}$/i.test(t));
    const hasRoman = /\b(I{1,3}|II|III)\b/.test(line);
    const tokenCount = tokens.length;

    // A data row has: date OR (long number AND codes) OR (roman numeral AND codes)
    if (tokenCount >= 4 && (hasDate || (hasLongNum && hasCodes) || (hasRoman && hasCodes))) {
      dataRows.push(line);
    }
  }

  return dataRows;
}

/**
 * Parse a single table row line into field values.
 * Expected token order: [rowNum?] date shift empNo opCode machineNo workOrder qty time
 */
function parseRowTokens(line) {
  const tokens = line.split(/[\s|]+/).filter(t => t && t !== '-' && t !== '—');
  const result = {
    date: null, shift: null, employeeNumber: null, machineNumber: null,
    operationCode: null, workOrderNumber: null, quantityProduced: null, timeTaken: null,
  };

  let i = 0;

  // Skip leading row number (1, 2, 3...)
  if (/^\d{1,2}$/.test(tokens[0]) && parseInt(tokens[0]) < 20) i++;

  // Date: DD/MM/YY
  if (i < tokens.length && /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(tokens[i])) {
    result.date = tokens[i++];
  }

  // Shift: Roman numeral or digit
  if (i < tokens.length && /^(I{1,3}|[123ABC])$/i.test(tokens[i])) {
    result.shift = SHIFT_MAP[tokens[i].toUpperCase()] || tokens[i];
    i++;
  }

  // Employee number: letters + digits
  if (i < tokens.length && /^[A-Z]{1,3}\d{3,6}$/i.test(tokens[i])) {
    result.employeeNumber = tokens[i++];
  }

  // Operation code: 6-digit number starting with 8
  if (i < tokens.length && /^8\d{5}$/.test(tokens[i])) {
    result.operationCode = tokens[i++];
  }

  // Machine number: MC-XXX or ML-XXX (garbled)
  if (i < tokens.length && /^(I?M[CL][-\s]?\d{3,4})$/i.test(tokens[i])) {
    result.machineNumber = normalizeMachineNumber(tokens[i++]);
  }

  // Work order: 6-digit number
  if (i < tokens.length && /^\d{5,7}$/.test(tokens[i])) {
    result.workOrderNumber = tokens[i++];
  }

  // Quantity: small number 1-9999
  if (i < tokens.length && /^\d{1,4}$/.test(tokens[i]) && parseInt(tokens[i]) < 10000) {
    result.quantityProduced = parseInt(tokens[i++]);
  }

  // Time: decimal
  if (i < tokens.length && /^\d+\.\d+$/.test(tokens[i])) {
    result.timeTaken = tokens[i++];
  }

  // Fallback: scan remaining tokens for any missed fields
  const remaining = tokens.slice(i);
  for (const t of remaining) {
    if (!result.machineNumber && /^(I?M[CL][-\s]?\d{3,4})$/i.test(t)) {
      result.machineNumber = normalizeMachineNumber(t);
    } else if (!result.operationCode && /^8\d{5}$/.test(t)) {
      result.operationCode = t;
    } else if (!result.workOrderNumber && /^\d{5,7}$/.test(t)) {
      result.workOrderNumber = t;
    } else if (!result.quantityProduced && /^\d{1,4}$/.test(t) && parseInt(t) < 10000) {
      result.quantityProduced = parseInt(t);
    } else if (!result.timeTaken && /^\d+\.\d+$/.test(t)) {
      result.timeTaken = t;
    }
  }

  return result;
}

/**
 * Extract ALL rows from OCR text.
 * Returns array of extracted row objects.
 */
function extractHeuristicRows(ocrText) {
  const dataRows = detectDataRows(ocrText);
  if (dataRows.length === 0) {
    // Fallback: try to extract at least one record from the whole text
    return [extractSingleFromText(ocrText)];
  }
  return dataRows.map(line => parseRowTokens(line));
}

/**
 * Single-record fallback using number patterns.
 */
function extractSingleFromText(text) {
  const result = {
    date: null, shift: null, employeeNumber: null, machineNumber: null,
    operationCode: null, workOrderNumber: null, quantityProduced: null, timeTaken: null,
  };

  const dateMatch = text.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/);
  if (dateMatch) result.date = dateMatch[1];

  const shiftMatch = text.match(/\b(III|II|I|[123ABC])\b/);
  if (shiftMatch) result.shift = SHIFT_MAP[shiftMatch[1].toUpperCase()] || shiftMatch[1];

  const empMatch = text.match(/\b(BT\d{3,6})\b/i) || text.match(/\b([A-Z]{1,3}\d{4,6})\b/);
  if (empMatch) result.employeeNumber = empMatch[1];

  const mcMatch = text.match(/\b(I?M[CL][-\s]?\d{3,4})\b/i);
  if (mcMatch) result.machineNumber = normalizeMachineNumber(mcMatch[1]);

  const allNums = extractAllNumbers(text);
  const sixDigit = allNums.filter(n => /^\d{6}$/.test(n.value));
  const opCode = sixDigit.find(n => n.value.startsWith('8'));
  if (opCode) result.operationCode = opCode.value;
  const wo = sixDigit.find(n => !n.value.startsWith('8'));
  if (wo) result.workOrderNumber = wo.value;

  if (result.workOrderNumber) {
    const woIdx = text.indexOf(result.workOrderNumber);
    const afterWO = text.slice(woIdx + result.workOrderNumber.length);
    const qtyMatch = afterWO.match(/\b(\d{1,4})\b/);
    if (qtyMatch) { const n = parseInt(qtyMatch[1]); if (n > 0 && n < 10000) result.quantityProduced = n; }
  }

  const decimals = allNums.filter(n => /^\d+\.\d+$/.test(n.value));
  if (decimals.length > 0) result.timeTaken = decimals[decimals.length - 1].value;

  return result;
}

// Legacy single-record function for backward compatibility
function extractHeuristic(ocrText) {
  const rows = extractHeuristicRows(ocrText);
  const merged = rows[0] || {};
  const fields = ['date', 'shift', 'employeeNumber', 'machineNumber', 'operationCode', 'workOrderNumber', 'quantityProduced', 'timeTaken'];
  const found = fields.filter(f => merged[f] !== null).length;
  return { extracted: merged, confidence: found / fields.length, foundCount: found, totalFields: fields.length };
}

module.exports = { extractHeuristic, extractHeuristicRows, normalizeMachineNumber };
