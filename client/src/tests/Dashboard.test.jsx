import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Dashboard from '../pages/Dashboard';
import * as api from '../services/api';

const mockDashboardData = {
  totalRecords: 42,
  reviewRequiredCount: 7,
  byShift: { A: 15, B: 18, C: 9 },
  byMachine: { 'MC-001': 10, 'MC-002': 8 },
  totalQuantityProduced: 125000,
  dailyCounts: [{ date: '2024-01-15', count: 3 }],
};

describe('Dashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders summary cards with mocked data', async () => {
    vi.spyOn(api, 'getDashboard').mockResolvedValue({ data: mockDashboardData });
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
    });
  });

  test('renders Total Uploads label', async () => {
    vi.spyOn(api, 'getDashboard').mockResolvedValue({ data: mockDashboardData });
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Total Uploads')).toBeInTheDocument());
  });

  test('renders Validation Failures label', async () => {
    vi.spyOn(api, 'getDashboard').mockResolvedValue({ data: mockDashboardData });
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText('Validation Failures')).toBeInTheDocument());
  });

  test('shows error banner on API failure', async () => {
    vi.spyOn(api, 'getDashboard').mockRejectedValue(new Error('Network error'));
    render(<Dashboard />);
    await waitFor(() => expect(screen.getByText(/failed to load dashboard/i)).toBeInTheDocument());
  });

  test('shows loading skeleton initially', () => {
    vi.spyOn(api, 'getDashboard').mockReturnValue(new Promise(() => {}));
    render(<Dashboard />);
    // Loading state shows animated pulse divs — check no data yet
    expect(screen.queryByText('Total Uploads')).not.toBeInTheDocument();
  });
});
