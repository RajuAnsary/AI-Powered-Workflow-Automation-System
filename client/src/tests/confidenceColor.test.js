import { fc } from '@fast-check/vitest';
import { getConfidenceColor } from '../pages/Review';

// ─── Property 5: Confidence Score Color Classification ────────────────────────
// Tag: Feature: biztelai-workflow-automation, Property 5: Confidence Score Color Classification

describe('Property 5: Confidence Score Color Classification', () => {
  test('green iff score >= 0.8', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.8), max: Math.fround(1.0), noNaN: true }),
        (score) => getConfidenceColor(score) === 'green'
      ),
      { numRuns: 1000 }
    );
  });

  test('yellow iff 0.5 <= score < 0.8', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.5), max: Math.fround(0.7999), noNaN: true }),
        (score) => getConfidenceColor(score) === 'yellow'
      ),
      { numRuns: 1000 }
    );
  });

  test('red iff score < 0.5', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0), max: Math.fround(0.4999), noNaN: true }),
        (score) => getConfidenceColor(score) === 'red'
      ),
      { numRuns: 1000 }
    );
  });

  test('no score maps to more than one color', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
        (score) => {
          const color = getConfidenceColor(score);
          const validColors = ['green', 'yellow', 'red'];
          return validColors.includes(color) &&
            validColors.filter(c => c === color).length === 1;
        }
      ),
      { numRuns: 1000 }
    );
  });

  test('every valid score is classified (not undefined)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0), max: Math.fround(1), noNaN: true }),
        (score) => getConfidenceColor(score) !== undefined
      ),
      { numRuns: 1000 }
    );
  });
});
