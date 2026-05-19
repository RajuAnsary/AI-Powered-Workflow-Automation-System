import { render, screen } from '@testing-library/react';
import RecordTable from '../components/RecordTable';

const mockRecords = [
  {
    _id: '1',
    fileName: 'report1.jpg',
    createdAt: '2024-01-15T10:00:00.000Z',
    extractedData: { shift: 'A', machineNumber: 'MC-001', workOrderNumber: 'WO-001' },
    reviewRequired: false,
  },
  {
    _id: '2',
    fileName: 'report2.pdf',
    createdAt: '2024-01-16T10:00:00.000Z',
    extractedData: { shift: 'B', machineNumber: 'MC-002', workOrderNumber: 'WO-002' },
    reviewRequired: true,
  },
];

describe('RecordTable', () => {
  test('renders correct number of rows', () => {
    render(<RecordTable records={mockRecords} />);
    expect(screen.getByText('report1.jpg')).toBeInTheDocument();
    expect(screen.getByText('report2.pdf')).toBeInTheDocument();
  });

  test('renders ValidationBadge for each row', () => {
    render(<RecordTable records={mockRecords} />);
    expect(screen.getByText('Validated')).toBeInTheDocument();
    expect(screen.getByText('Review Required')).toBeInTheDocument();
  });

  test('shows empty state when records is empty', () => {
    render(<RecordTable records={[]} />);
    expect(screen.getByText(/no records found/i)).toBeInTheDocument();
  });

  test('displays machine number and shift', () => {
    render(<RecordTable records={mockRecords} />);
    expect(screen.getByText('MC-001')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
