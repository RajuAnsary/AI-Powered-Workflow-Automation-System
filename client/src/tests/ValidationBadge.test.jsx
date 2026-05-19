import { render, screen } from '@testing-library/react';
import ValidationBadge from '../components/ValidationBadge';

describe('ValidationBadge', () => {
  test('renders green "Validated" badge when reviewRequired is false', () => {
    render(<ValidationBadge reviewRequired={false} />);
    const badge = screen.getByText('Validated');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('green');
  });

  test('renders red "Review Required" badge when reviewRequired is true', () => {
    render(<ValidationBadge reviewRequired={true} />);
    const badge = screen.getByText('Review Required');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('red');
  });
});
