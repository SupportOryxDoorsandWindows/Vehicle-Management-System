import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth } from '../RequireAuth';
import { useAuth } from '../../contexts/AuthContext';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

describe('RequireAuth', () => {
  it('shows nothing while auth state is loading', () => {
    vi.mocked(useAuth).mockReturnValue({ loading: true, session: null, profile: null } as never);
    render(
      <MemoryRouter initialEntries={['/vehicles']}>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/vehicles" element={<RequireAuth><p>vehicles page</p></RequireAuth>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByText('vehicles page')).not.toBeInTheDocument();
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
  });

  it('redirects to /login when there is no session', () => {
    vi.mocked(useAuth).mockReturnValue({ loading: false, session: null, profile: null } as never);
    render(
      <MemoryRouter initialEntries={['/vehicles']}>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/vehicles" element={<RequireAuth><p>vehicles page</p></RequireAuth>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('renders children when an active session exists', () => {
    vi.mocked(useAuth).mockReturnValue({
      loading: false,
      session: { user: { id: 'u1' } },
      profile: { id: 'u1', email: 'a@b.com', role: 'viewer', active: true },
    } as never);
    render(
      <MemoryRouter initialEntries={['/vehicles']}>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/vehicles" element={<RequireAuth><p>vehicles page</p></RequireAuth>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('vehicles page')).toBeInTheDocument();
  });
});
