import { describe, it, expect, vi, beforeEach } from 'vitest';
import { driverKey, removeDriverPhoto, uploadDriverPhoto, type DriverPhoto } from '../driverPhotos';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({ supabase: { from: vi.fn(), storage: { from: vi.fn() } } }));

const calls: string[] = [];
let bucket: { upload: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
const jpg = new File(['img'], 'Ronald Photo.jpg', { type: 'image/jpeg' });

function mockTable({
  existing = null,
  upsertResult = { data: { id: 'p2' }, error: null },
  deleteResult = { data: [{ id: 'p1' }], error: null },
}: {
  existing?: Partial<DriverPhoto> | null;
  upsertResult?: { data: unknown; error: unknown };
  deleteResult?: { data: unknown; error: unknown };
}) {
  const upsert = vi.fn(() => ({
    select: () => ({
      single: async () => {
        calls.push('row.upsert');
        return upsertResult;
      },
    }),
  }));
  vi.mocked(supabase.from).mockReturnValue({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: existing, error: null }) }) }),
    upsert,
    delete: () => ({
      eq: () => ({
        select: async () => {
          calls.push('row.delete');
          return deleteResult;
        },
      }),
    }),
  } as never);
  return upsert;
}

beforeEach(() => {
  calls.length = 0;
  bucket = {
    upload: vi.fn(async (path: string) => {
      calls.push(`file.upload ${path.split('/')[1]}`);
      return { data: {}, error: null };
    }),
    remove: vi.fn(async (paths: string[]) => {
      calls.push(`file.remove ${paths[0]}`);
      return { data: [], error: null };
    }),
  };
  vi.mocked(supabase.storage.from).mockReturnValue(bucket as never);
});

describe('driverKey', () => {
  it('ignores case and extra spaces, so one driver has one photo', () => {
    expect(driverKey('  Anoop  Kaloli ')).toBe('anoop kaloli');
    expect(driverKey('Charles Felimon')).toBe(driverKey('charles   felimon'));
  });
});

describe('uploadDriverPhoto', () => {
  it("stores the photo and saves it under the driver's key", async () => {
    const upsert = mockTable({});
    await uploadDriverPhoto('Anoop  Kaloli', jpg);

    const [path] = bucket.upload.mock.calls[0];
    expect(path).toMatch(/^drivers\/anoop-kaloli\/[0-9a-f-]{36}-Ronald_Photo\.jpg$/);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ driver_key: 'anoop kaloli', driver_name: 'Anoop  Kaloli', storage_path: path }),
      { onConflict: 'driver_key' }
    );
    expect(calls).toEqual(['file.upload anoop-kaloli', 'row.upsert']);
  });

  it('removes the previous photo file after a replacement is saved', async () => {
    mockTable({ existing: { id: 'p1', storage_path: 'drivers/anoop-kaloli/old.jpg' } });
    await uploadDriverPhoto('Anoop Kaloli', jpg);
    expect(calls).toEqual(['file.upload anoop-kaloli', 'row.upsert', 'file.remove drivers/anoop-kaloli/old.jpg']);
  });

  it('keeps the old photo and removes the new file if saving fails', async () => {
    mockTable({
      existing: { id: 'p1', storage_path: 'drivers/ronald/old.jpg' },
      upsertResult: { data: null, error: { message: 'permission denied' } },
    });
    await expect(uploadDriverPhoto('Ronald', jpg)).rejects.toMatchObject({ message: 'permission denied' });
    expect(calls[2]).toMatch(/^file\.remove drivers\/ronald\/[0-9a-f-]{36}-/);
    expect(calls).not.toContain('file.remove drivers/ronald/old.jpg');
  });

  it('rejects non-images and missing drivers without uploading', async () => {
    mockTable({});
    await expect(
      uploadDriverPhoto('Ronald', new File(['x'], 'a.pdf', { type: 'application/pdf' }))
    ).rejects.toThrow(/isn't a photo/);
    await expect(uploadDriverPhoto('   ', jpg)).rejects.toThrow(/no driver/);
    expect(bucket.upload).not.toHaveBeenCalled();
  });
});

describe('removeDriverPhoto', () => {
  const photo = { id: 'p1', storage_path: 'drivers/ronald/x.jpg' } as DriverPhoto;

  it('deletes the row before the file', async () => {
    mockTable({});
    await removeDriverPhoto(photo);
    expect(calls).toEqual(['row.delete', 'file.remove drivers/ronald/x.jpg']);
  });

  it('keeps the file if the row could not be removed', async () => {
    mockTable({ deleteResult: { data: [], error: null } });
    await expect(removeDriverPhoto(photo)).rejects.toThrow(/wasn't saved/);
    expect(bucket.remove).not.toHaveBeenCalled();
  });
});
