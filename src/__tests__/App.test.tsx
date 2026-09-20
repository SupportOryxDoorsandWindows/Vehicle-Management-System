import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import App from '../App';

vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuth: () => ({
    loading: false,
    session: { user: { id: 'u1' } },
    profile: { id: 'u1', email: 'a@b.com', role: 'admin', active: true },
    signOut: vi.fn(),
  }),
}));

describe('App shell', () => {
  it('renders the nav bar with links to Dashboard, Vehicles, Unassigned Expenses, and Reports', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /vehicles/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /unassigned expenses/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /reports/i })).toBeInTheDocument();
  });
});
