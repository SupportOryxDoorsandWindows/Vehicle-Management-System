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

  it('updates a profile role', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ update: () => ({ eq }) } as never);

    await updateProfileRole('user-1', 'admin');
    expect(eq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('sets a profile active/inactive', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({ update: () => ({ eq }) } as never);

    await setProfileActive('user-1', false);
    expect(eq).toHaveBeenCalledWith('id', 'user-1');
  });
});
