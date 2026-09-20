import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NavBar } from '../NavBar';
import { useAuth } from '../../contexts/AuthContext';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

describe('NavBar', () => {
  it('shows the signed-in email but no Manage Users link for a Viewer', () => {
    const signOut = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      loading: false,
      session: { user: { id: 'u1' } },
      profile: { id: 'u1', email: 'viewer@oryxdoors.com', role: 'viewer', active: true },
      signOut,
    } as never);

    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    );

    expect(screen.getByText('viewer@oryxdoors.com')).toBeInTheDocument();
    expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
  });

  it('shows the Manage Users link for an Admin and calls signOut on click', async () => {
    const signOut = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      loading: false,
      session: { user: { id: 'u1' } },
      profile: { id: 'u1', email: 'admin@oryxdoors.com', role: 'admin', active: true },
      signOut,
    } as never);

    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    );

    expect(screen.getByText('Manage Users')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(signOut).toHaveBeenCalled();
  });
});
