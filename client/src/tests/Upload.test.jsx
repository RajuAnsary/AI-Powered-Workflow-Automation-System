import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Upload from '../pages/Upload';
import * as api from '../services/api';

function renderUpload() {
  return render(
    <MemoryRouter initialEntries={['/upload']}>
      <Routes>
        <Route path="/upload" element={<Upload />} />
        <Route path="/review" element={<div>Review Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Upload page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, 'getRecords').mockResolvedValue({ data: [] });
  });

  test('renders UploadBox', () => {
    renderUpload();
    expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
  });

  test('shows error banner on API failure', async () => {
    vi.spyOn(api, 'uploadFile').mockRejectedValue({
      response: { data: { error: 'OCR failed' } },
    });
    renderUpload();

    // Simulate file selection and form submit
    const input = screen.getByLabelText('File input');
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });

    const submitBtn = screen.getByText('Process Document');
    fireEvent.click(submitBtn);

    await waitFor(() => expect(screen.getByText('OCR failed')).toBeInTheDocument());
  });

  test('navigates to /review on successful upload', async () => {
    vi.spyOn(api, 'uploadFile').mockResolvedValue({
      data: {
        _id: 'abc',
        fileName: 'test.jpg',
        extractedData: {},
        confidenceScores: {},
        validationErrors: [],
        reviewRequired: false,
      },
    });
    renderUpload();

    const input = screen.getByLabelText('File input');
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });

    fireEvent.click(screen.getByText('Process Document'));

    await waitFor(() => expect(screen.getByText('Review Page')).toBeInTheDocument());
  });
});
