import { describe, it, expect, vi } from 'vitest';
import { deleteRow, isStillReferenced } from '../deleteRow';
import { NOT_SAVED_MESSAGE } from '../errors';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({ supabase: { from: vi.fn() } }));

function mockDelete(result: { data: unknown; error: unknown }) {
  const select = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ select });
  vi.mocked(supabase.from).mockReturnValue({ delete: () => ({ eq }) } as never);
  return eq;
}

describe('deleteRow', () => {
  it('deletes the row by id', async () => {
    const eq = mockDelete({ data: [{ id: 'v1' }], error: null });
    await deleteRow('vehicles', 'v1');
    expect(supabase.from).toHaveBeenCalledWith('vehicles');
    expect(eq).toHaveBeenCalledWith('id', 'v1');
  });

  it('treats "nothing deleted" (RLS) as a failure', async () => {
    mockDelete({ data: [], error: null });
    await expect(deleteRow('expenses', 'e1')).rejects.toThrow(NOT_SAVED_MESSAGE);
  });

  it('passes database errors on', async () => {
    const error = { code: '23503', message: 'violates foreign key constraint' };
    mockDelete({ data: null, error });
    await expect(deleteRow('vehicles', 'v1')).rejects.toBe(error);
    expect(isStillReferenced(error)).toBe(true);
    expect(isStillReferenced(new Error('other'))).toBe(false);
  });
});
