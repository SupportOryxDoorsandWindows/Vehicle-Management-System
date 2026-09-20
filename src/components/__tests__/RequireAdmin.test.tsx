import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireAdmin } from '../RequireAdmin';
import { useAuth } from '../../contexts/AuthContext';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

describe('RequireAdmin', () => {
  it('shows nothing while auth state is loading', () => {
    vi.mocked(useAuth).mockReturnValue({ loading: true, profile: null } as never);
    render(
      <MemoryRouter initialEntries={['/users']}>
        <Routes>
          <Route path="/" element={<p>dashboard</p>} />
          <Route path="/users" element={<RequireAdmin><p>manage users</p></RequireAdmin>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByText('manage users')).not.toBeInTheDocument();
    expect(screen.queryByText('dashboard')).not.toBeInTheDocument();
  });

  it('redirects a Viewer to the dashboard', () => {
    vi.mocked(useAuth).mockReturnValue({
      loading: false,
      profile: { id: 'u1', email: 'v@b.com', role: 'viewer', active: true },
    } as never);

    render(
      <MemoryRouter initialEntries={['/users']}>
        <Routes>
          <Route path="/" element={<p>dashboard</p>} />
          <Route path="/users" element={<RequireAdmin><p>manage users</p></RequireAdmin>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });

  it('renders children for an Admin', () => {
    vi.mocked(useAuth).mockReturnValue({
      loading: false,
      profile: { id: 'u1', email: 'a@b.com', role: 'admin', active: true },
    } as never);

    render(
      <MemoryRouter initialEntries={['/users']}>
        <Routes>
          <Route path="/" element={<p>dashboard</p>} />
          <Route path="/users" element={<RequireAdmin><p>manage users</p></RequireAdmin>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('manage users')).toBeInTheDocument();
  });
});
