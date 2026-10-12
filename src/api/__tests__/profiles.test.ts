import { describe, it, expect, vi } from 'vitest';
import { fetchProfiles, updateProfileRole, setProfileActive } from '../profiles';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({ supabase: { from: vi.fn() } }));

describe('profiles API', () => {
  it('fetches all profiles ordered by email', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: '1', email: 'a@b.com', role: 'admin', active: true }],
      error: null,
    });
    vi.mocked(supabase.from).mockReturnValue({ select: () => ({ order }) } as never);

    const result = await fetchProfiles();
    expect(result).toHaveLength(1);
    expect(order).toHaveBeenCalledWith('email');
  });

  function mockUpdateReturning(result: { data: unknown; error: unknown }) {
    const select = vi.fn().mockResolvedValue(result);
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    vi.mocked(supabase.from).mockReturnValue({ update } as never);
    return { update, eq };
  }

  it('updates a profile role', async () => {
    const { update, eq } = mockUpdateReturning({ data: [{ id: 'user-1' }], error: null });

    await updateProfileRole('user-1', 'admin');
    expect(update).toHaveBeenCalledWith({ role: 'admin' });
    expect(eq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('sets a profile active/inactive', async () => {
    const { update, eq } = mockUpdateReturning({ data: [{ id: 'user-1' }], error: null });

    await setProfileActive('user-1', false);
    expect(update).toHaveBeenCalledWith({ active: false });
    expect(eq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('throws when RLS silently matches no rows', async () => {
    mockUpdateReturning({ data: [], error: null });

    await expect(setProfileActive('user-1', false)).rejects.toThrow(/wasn't saved/);
  });

  it('throws the Supabase error when the update fails', async () => {
    mockUpdateReturning({ data: null, error: { message: 'permission denied' } });

    await expect(updateProfileRole('user-1', 'viewer')).rejects.toMatchObject({
      message: 'permission denied',
    });
  });
});
