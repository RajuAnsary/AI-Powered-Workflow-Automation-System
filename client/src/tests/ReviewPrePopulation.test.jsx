import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fc } from '@fast-check/vitest';
import Review from '../pages/Review';

const FIELDS = ['date', 'shift', 'employeeNumber', 'machineNumber', 'operationCode', 'workOrderNumber', 'quantityProduced', 'timeTaken'];

function renderReviewWithState(extractedData) {
  const state = {
    _id: 'test-id',
    fileName: 'test.jpg',
    originalText: '',
    extractedData,
    confidenceScores: {},
    validationErrors: [],
    reviewRequired: false,
  };
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/review', state }]}>
      <Routes>
        <Route path="/review" element={<Review />} />
        <Route path="/upload" element={<div>Upload</div>} />
        <Route path="/history" element={<div>History</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// ─── Property 12: Review Page Pre-Population ─────────────────────────────────
// Tag: Feature: biztelai-workflow-automation, Property 12: Review Page Pre-Population

describe('Property 12: Review Page Pre-Population', () => {
  test('each of the 8 input fields is pre-populated with extractedData value', () => {
    fc.assert(
      fc.property(
        fc.record({
          date: fc.stringMatching(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
          shift: fc.constantFrom('A', 'B', 'C'),
          employeeNumber: fc.stringMatching(/^EMP-[0-9]{3}$/),
          machineNumber: fc.stringMatching(/^MC-[0-9]{3}$/),
          operationCode: fc.stringMatching(/^OP-[0-9]{1,3}$/),
          workOrderNumber: fc.stringMatching(/^WO-[0-9]{4}-[0-9]{3}$/),
          quantityProduced: fc.integer({ min: 1, max: 9999 }),
          timeTaken: fc.stringMatching(/^[0-9]{1,2}h$/),
        }),
        (extractedData) => {
          const { unmount } = renderReviewWithState(extractedData);

          const allPopulated = FIELDS.every(field => {
            const value = String(extractedData[field]);
            const input = screen.queryByDisplayValue(value);
            return input !== null;
          });

          unmount();
          return allPopulated;
        }
      ),
      { numRuns: 50 }
    );
  });
});
