import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireAdmin } from '../RequireAdmin';
import { useAuth } from '../../contexts/AuthContext';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

describe('RequireAdmin', () => {
  it('shows nothing while auth state is loading', () => {
    vi.mocked(useAuth).mockReturnValue({ loading: true, profileLoading: false, profile: null } as never);
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

  it('shows nothing while a profile fetch is in flight (even once the initial loading check has cleared)', () => {
    vi.mocked(useAuth).mockReturnValue({ loading: false, profileLoading: true, profile: null } as never);
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
      profileLoading: false,
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

  it('redirects a deactivated Admin to the dashboard', () => {
    vi.mocked(useAuth).mockReturnValue({
      loading: false,
      profileLoading: false,
      profile: { id: 'u1', email: 'a@b.com', role: 'admin', active: false },
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
    expect(screen.queryByText('manage users')).not.toBeInTheDocument();
  });

  it('renders children for an Admin', () => {
    vi.mocked(useAuth).mockReturnValue({
      loading: false,
      profileLoading: false,
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

  it('renders children during a background profile refresh (profileLoading true but profile already set)', () => {
    vi.mocked(useAuth).mockReturnValue({
      loading: false,
      profileLoading: true,
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
