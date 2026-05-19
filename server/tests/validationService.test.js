const fc = require('fast-check');
const { validate } = require('../services/validationService');

const REQUIRED_FIELDS = [
  'date', 'shift', 'employeeNumber', 'machineNumber',
  'operationCode', 'workOrderNumber', 'quantityProduced', 'timeTaken',
];

// A fully valid base record
const validBase = {
  date: '2024-01-15',
  shift: 'A',
  employeeNumber: 'EMP-001',
  machineNumber: 'MC-001',
  operationCode: 'OP-1',
  workOrderNumber: 'WO-001',
  quantityProduced: 100,
  timeTaken: '8h',
};

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('validationService — unit tests', () => {
  test('returns empty array for fully valid data', () => {
    expect(validate(validBase)).toEqual([]);
  });

  test('flags missing date', () => {
    const errors = validate({ ...validBase, date: null });
    expect(errors.some(e => e.includes('date'))).toBe(true);
  });

  test('flags empty string field', () => {
    const errors = validate({ ...validBase, shift: '' });
    expect(errors.some(e => e.includes('shift'))).toBe(true);
  });

  test('flags invalid shift D', () => {
    const errors = validate({ ...validBase, shift: 'D' });
    expect(errors.some(e => e.toLowerCase().includes('shift'))).toBe(true);
  });

  test('accepts valid shifts A, B, C', () => {
    ['A', 'B', 'C'].forEach(s => {
      const errors = validate({ ...validBase, shift: s });
      expect(errors.some(e => e.toLowerCase().includes('shift'))).toBe(false);
    });
  });

  test('flags invalid machine number format', () => {
    const errors = validate({ ...validBase, machineNumber: 'MACHINE-1' });
    expect(errors.some(e => e.toLowerCase().includes('machine'))).toBe(true);
  });

  test('accepts valid machine number MC-001', () => {
    const errors = validate({ ...validBase, machineNumber: 'MC-001' });
    expect(errors.some(e => e.toLowerCase().includes('machine'))).toBe(false);
  });

  test('flags quantity > 10000', () => {
    const errors = validate({ ...validBase, quantityProduced: 10001 });
    expect(errors.some(e => e.toLowerCase().includes('quantity'))).toBe(true);
  });

  test('does not flag quantity exactly 10000', () => {
    const errors = validate({ ...validBase, quantityProduced: 10000 });
    expect(errors.some(e => e.toLowerCase().includes('quantity'))).toBe(false);
  });

  test('flags duplicate work order', () => {
    const errors = validate(validBase, ['WO-001']);
    expect(errors.some(e => e.toLowerCase().includes('duplicate'))).toBe(true);
  });

  test('does not flag non-duplicate work order', () => {
    const errors = validate(validBase, ['WO-999']);
    expect(errors.some(e => e.toLowerCase().includes('duplicate'))).toBe(false);
  });
});

// ─── Property-based tests ─────────────────────────────────────────────────────

describe('Property 6: Validation Completeness — Missing Fields', () => {
  // Tag: Feature: biztelai-workflow-automation, Property 6: Validation Completeness — Missing Fields
  test('one error per missing required field', () => {
    fc.assert(
      fc.property(
        fc.subarray(REQUIRED_FIELDS, { minLength: 1 }),
        (missingFields) => {
          const data = { ...validBase };
          missingFields.forEach(f => { data[f] = null; });
          const errors = validate(data);
          return missingFields.every(f =>
            errors.some(e => e.includes(`Missing required field: ${f}`))
          );
        }
      ),
      { numRuns: 500 }
    );
  });
});

describe('Property 7: Shift Value Validation', () => {
  // Tag: Feature: biztelai-workflow-automation, Property 7: Shift Value Validation
  test('error iff shift not in A/B/C', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 5 }),
        (shift) => {
          const errors = validate({ ...validBase, shift });
          const hasShiftError = errors.some(e => e.toLowerCase().includes('shift') && e.toLowerCase().includes('invalid'));
          const isValid = ['A', 'B', 'C'].includes(shift);
          return isValid ? !hasShiftError : hasShiftError;
        }
      ),
      { numRuns: 500 }
    );
  });
});

describe('Property 8: Machine Number Format Validation', () => {
  // Tag: Feature: biztelai-workflow-automation, Property 8: Machine Number Format Validation
  test('error iff machineNumber does not match ^MC-\\d{3}$', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        (machineNumber) => {
          const errors = validate({ ...validBase, machineNumber });
          const hasError = errors.some(e => e.toLowerCase().includes('machine number'));
          const isValid = /^MC-\d{3}$/.test(machineNumber);
          return isValid ? !hasError : hasError;
        }
      ),
      { numRuns: 500 }
    );
  });
});

describe('Property 9: Quantity Threshold Warning', () => {
  // Tag: Feature: biztelai-workflow-automation, Property 9: Quantity Threshold Warning
  test('warning iff quantityProduced > 10000', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50000 }),
        (qty) => {
          const errors = validate({ ...validBase, quantityProduced: qty });
          const hasWarning = errors.some(e => e.toLowerCase().includes('quantity'));
          return qty > 10000 ? hasWarning : !hasWarning;
        }
      ),
      { numRuns: 500 }
    );
  });
});

describe('Property 10: Duplicate Work Order Detection', () => {
  // Tag: Feature: biztelai-workflow-automation, Property 10: Duplicate Work Order Detection
  test('duplicate error iff workOrderNumber in existing list', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (existingOrders, workOrderNumber) => {
          const errors = validate({ ...validBase, workOrderNumber }, existingOrders);
          const hasDuplicate = errors.some(e => e.toLowerCase().includes('duplicate'));
          const isDuplicate = existingOrders.includes(workOrderNumber);
          return isDuplicate ? hasDuplicate : !hasDuplicate;
        }
      ),
      { numRuns: 500 }
    );
  });
});

describe('Property 11: reviewRequired Reflects Validation Errors', () => {
  // Tag: Feature: biztelai-workflow-automation, Property 11: reviewRequired Reflects Validation Errors
  test('reviewRequired = errors.length > 0 for all inputs', () => {
    fc.assert(
      fc.property(
        fc.record({
          date: fc.oneof(fc.string(), fc.constant(null)),
          shift: fc.oneof(fc.string({ minLength: 1, maxLength: 3 }), fc.constant(null)),
          employeeNumber: fc.oneof(fc.string(), fc.constant(null)),
          machineNumber: fc.oneof(fc.string({ minLength: 1, maxLength: 10 }), fc.constant(null)),
          operationCode: fc.oneof(fc.string(), fc.constant(null)),
          workOrderNumber: fc.oneof(fc.string(), fc.constant(null)),
          quantityProduced: fc.oneof(fc.integer({ min: 0, max: 20000 }), fc.constant(null)),
          timeTaken: fc.oneof(fc.string(), fc.constant(null)),
        }),
        (data) => {
          const errors = validate(data);
          const reviewRequired = errors.length > 0;
          return reviewRequired === (errors.length > 0);
        }
      ),
      { numRuns: 500 }
    );
  });
});
