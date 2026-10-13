import { describe, it, expect, vi } from 'vitest';
import { fetchSettings, updateExpiringSoonDays } from '../settings';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({ supabase: { from: vi.fn() } }));

describe('settings API', () => {
  it('reads the single settings row', async () => {
    const single = vi.fn().mockResolvedValue({ data: { expiring_soon_days: 30 }, error: null });
    const eq = vi.fn(() => ({ single }));
    vi.mocked(supabase.from).mockReturnValue({ select: () => ({ eq }) } as never);

    expect(await fetchSettings()).toEqual({ expiring_soon_days: 30 });
    expect(supabase.from).toHaveBeenCalledWith('app_settings');
    expect(eq).toHaveBeenCalledWith('id', true);
  });

  it('updates and returns the saved row', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { expiring_soon_days: 45 }, error: null });
    const update = vi.fn(() => ({ eq: () => ({ select: () => ({ maybeSingle }) }) }));
    vi.mocked(supabase.from).mockReturnValue({ update } as never);

    expect(await updateExpiringSoonDays(45)).toEqual({ expiring_soon_days: 45 });
    expect(update).toHaveBeenCalledWith({ expiring_soon_days: 45 });
  });

  it('treats an RLS-blocked update (no row back) as a failure', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(supabase.from).mockReturnValue({
      update: () => ({ eq: () => ({ select: () => ({ maybeSingle }) }) }),
    } as never);

    await expect(updateExpiringSoonDays(45)).rejects.toThrow(/wasn't saved/);
  });
});
