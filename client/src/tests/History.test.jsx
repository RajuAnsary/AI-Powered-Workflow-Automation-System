import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import History from '../pages/History';
import * as api from '../services/api';

const mockRecords = [
  {
    _id: '1',
    fileName: 'doc1.jpg',
    createdAt: '2024-01-15T10:00:00.000Z',
    extractedData: { shift: 'A', machineNumber: 'MC-001', workOrderNumber: 'WO-001' },
    reviewRequired: false,
  },
];

describe('History page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders RecordTable with fetched records', async () => {
    vi.spyOn(api, 'getRecords').mockResolvedValue({ data: mockRecords });
    render(<MemoryRouter><History /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('doc1.jpg')).toBeInTheDocument());
  });

  test('renders filter controls', async () => {
    vi.spyOn(api, 'getRecords').mockResolvedValue({ data: [] });
    render(<MemoryRouter><History /></MemoryRouter>);
    expect(screen.getByPlaceholderText(/MC-001/i)).toBeInTheDocument();
    expect(screen.getByText('Apply Filters')).toBeInTheDocument();
  });

  test('calls getRecords with filter params on submit', async () => {
    const spy = vi.spyOn(api, 'getRecords').mockResolvedValue({ data: [] });
    render(<MemoryRouter><History /></MemoryRouter>);

    const machineInput = screen.getByPlaceholderText(/MC-001/i);
    fireEvent.change(machineInput, { target: { value: 'MC-002' } });
    fireEvent.click(screen.getByText('Apply Filters'));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ machineNumber: 'MC-002' }));
    });
  });

  test('shows empty state when no records', async () => {
    vi.spyOn(api, 'getRecords').mockResolvedValue({ data: [] });
    render(<MemoryRouter><History /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/no records found/i)).toBeInTheDocument());
  });
});
