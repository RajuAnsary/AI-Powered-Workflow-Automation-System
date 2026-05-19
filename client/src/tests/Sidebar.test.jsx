import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

function renderWithRouter(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Sidebar />
    </MemoryRouter>
  );
}

describe('Sidebar', () => {
  test('renders app name BiztelAI', () => {
    renderWithRouter();
    expect(screen.getByText('BiztelAI')).toBeInTheDocument();
  });

  test('renders all navigation links', () => {
    renderWithRouter();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  test('applies active class to Dashboard link on / route', () => {
    renderWithRouter('/');
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink.className).toContain('bg-blue-600');
  });

  test('applies active class to Upload link on /upload route', () => {
    renderWithRouter('/upload');
    const uploadLink = screen.getByText('Upload').closest('a');
    expect(uploadLink.className).toContain('bg-blue-600');
  });
});
