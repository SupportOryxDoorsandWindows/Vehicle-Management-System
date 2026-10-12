import { describe, it, expect, vi } from 'vitest';
import { fetchVehicleById } from '../vehicles';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({ supabase: { from: vi.fn() } }));

describe('fetchVehicleById', () => {
  it('returns null for a malformed id without querying the database', async () => {
    expect(await fetchVehicleById('not-a-uuid')).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('queries by id for a well-formed uuid', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    vi.mocked(supabase.from).mockReturnValue({ select: () => ({ eq }) } as never);

    const id = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b';
    await fetchVehicleById(id);
    expect(eq).toHaveBeenCalledWith('id', id);
  });
});
