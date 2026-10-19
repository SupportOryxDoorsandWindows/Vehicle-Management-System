import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NavBar } from '../NavBar';
import { useAuth } from '../../contexts/AuthContext';
import * as vehiclesApi from '../../api/vehicles';
import * as expensesApi from '../../api/expenses';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

function signIn(role: 'admin' | 'viewer', signOut = vi.fn()) {
  vi.mocked(useAuth).mockReturnValue({
    loading: false,
    session: { user: { id: 'u1' } },
    profile: { id: 'u1', email: `${role}@oryxdoors.com`, role, active: true },
    signOut,
  } as never);
  return signOut;
}

beforeEach(() => {
  vi.spyOn(vehiclesApi, 'countVehicles').mockResolvedValue(52);
  vi.spyOn(expensesApi, 'countUnassignedExpenses').mockResolvedValue(23);
});

describe('NavBar', () => {
  it('shows the signed-in email and role but no admin links for a Viewer', () => {
    signIn('viewer');
    render(<MemoryRouter><NavBar /></MemoryRouter>);

    expect(screen.getByText('viewer@oryxdoors.com')).toBeInTheDocument();
    expect(screen.getByText('Viewer')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'History' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('shows History, Users and Settings to an Admin, and calls signOut on Log out', async () => {
    const signOut = signIn('admin');
    render(<MemoryRouter><NavBar /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'History' })).toHaveAttribute('href', '/history');
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/users');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    await userEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(signOut).toHaveBeenCalled();
  });

  it('counts vehicles and the expenses still to assign', async () => {
    signIn('viewer');
    render(<MemoryRouter><NavBar /></MemoryRouter>);

    expect(await screen.findByRole('link', { name: 'Vehicles (52)' })).toHaveAttribute('href', '/vehicles');
    expect(screen.getByRole('link', { name: 'To assign (23)' })).toHaveAttribute('href', '/unassigned-expenses');
  });

  it('leaves a count out when it fails to load', async () => {
    signIn('viewer');
    vi.spyOn(vehiclesApi, 'countVehicles').mockRejectedValue(new Error('offline'));
    render(<MemoryRouter><NavBar /></MemoryRouter>);

    expect(await screen.findByRole('link', { name: 'To assign (23)' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Vehicles' })).toBeInTheDocument();
  });
});
