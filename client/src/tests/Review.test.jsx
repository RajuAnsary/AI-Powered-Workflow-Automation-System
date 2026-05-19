import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import Review, { getConfidenceColor } from '../pages/Review';
import * as api from '../services/api';

const mockResult = {
  _id: 'abc123',
  fileName: 'test.jpg',
  originalText: 'raw text',
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
  confidenceScores: { date: 0.9, shift: 0.95 },
  validationErrors: [],
  reviewRequired: false,
};

function renderReview(state = mockResult) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/review', state }]}>
      <Routes>
        <Route path="/review" element={<Review />} />
        <Route path="/history" element={<div>History Page</div>} />
        <Route path="/upload" element={<div>Upload Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Review page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('pre-populates all 8 fields from extractedData', () => {
    renderReview();
    expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('EMP-001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MC-001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('OP-1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('WO-001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('8h')).toBeInTheDocument();
  });

  test('confirm button calls confirmRecord', async () => {
    vi.spyOn(api, 'confirmRecord').mockResolvedValue({ data: {} });
    renderReview();
    // There are two "Confirm & Save" buttons (top bar + bottom of form); click the first
    fireEvent.click(screen.getAllByText(/confirm & save/i)[0]);
    await waitFor(() => expect(api.confirmRecord).toHaveBeenCalledWith('abc123', expect.any(Object)));
  });

  test('discard button navigates to /upload', () => {
    renderReview();
    // There are two Discard buttons; click the first
    fireEvent.click(screen.getAllByText('Discard')[0]);
    expect(screen.getByText('Upload Page')).toBeInTheDocument();
  });

  test('shows error banner when confirmRecord fails', async () => {
    vi.spyOn(api, 'confirmRecord').mockRejectedValue({
      response: { data: { error: 'Save failed' } },
    });
    renderReview();
    fireEvent.click(screen.getAllByText(/confirm & save/i)[0]);
    await waitFor(() => expect(screen.getByText('Save failed')).toBeInTheDocument());
  });

  test('shows warning when no state is provided', () => {
    render(
      <MemoryRouter initialEntries={['/review']}>
        <Routes>
          <Route path="/review" element={<Review />} />
          <Route path="/upload" element={<div>Upload Page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/no extraction result found/i)).toBeInTheDocument();
  });
});
