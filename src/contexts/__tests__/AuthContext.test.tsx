import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
}));

function Probe() {
  const { loading, session, profile } = useAuth();
  if (loading) return <p>loading</p>;
  return <p>{session ? `signed in as ${profile?.role}` : 'signed out'}</p>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthContext', () => {
  it('starts loading, then reflects no session when there is none', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('signed out')).toBeInTheDocument());
  });

  it('loads the profile row once a session exists', async () => {
    const fakeSession = { user: { id: 'user-1' } };
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: fakeSession },
      error: null,
    } as never);
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'user-1', email: 'a@b.com', role: 'admin', active: true },
      error: null,
    });
    vi.mocked(supabase.from).mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle }) }),
    } as never);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText('signed in as admin')).toBeInTheDocument());
  });
});
