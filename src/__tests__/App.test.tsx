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

// The shell renders the Dashboard and loads settings; keep every request
// pending so the test never touches the network.
const { pending } = vi.hoisted(() => ({ pending: () => vi.fn(() => new Promise<never>(() => {})) }));
vi.mock('../api/settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/settings')>()),
  fetchSettings: pending(),
}));
vi.mock('../api/vehicles', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/vehicles')>()),
  fetchVehicles: pending(),
}));
vi.mock('../api/expenses', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/expenses')>()),
  fetchAllExpenses: pending(),
  fetchUnassignedExpenses: pending(),
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
