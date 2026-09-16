import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App shell', () => {
  it('renders the nav bar with links to Dashboard, Vehicles, Unassigned Expenses, and Reports', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /vehicles/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /unassigned expenses/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /reports/i })).toBeInTheDocument();
  });
});
