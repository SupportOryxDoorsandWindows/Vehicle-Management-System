import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import {
  createTestUser,
  deleteTestUser,
  setTestUserActive,
  type TestUser,
} from '../../test/testAuthHelpers';
import { signInAsTestUser, signOutTestUser } from '../../test/integrationAuthSetup';

describe('RLS enforcement (integration, real Supabase project)', () => {
  it('denies reads to a completely unauthenticated client', async () => {
    const anon = createClient(
      process.env.VITE_SUPABASE_URL as string,
      process.env.VITE_SUPABASE_ANON_KEY as string
    );
    const { data, error } = await anon.from('vehicles').select('*');
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('lets a Viewer read but rejects a Viewer write attempt', async () => {
    const viewer = await createTestUser('viewer');
    try {
      await signInAsTestUser(viewer);
      const { data: readData, error: readError } = await supabase.from('vehicles').select('*');
      expect(readError).toBeNull();
      expect(readData!.length).toBeGreaterThan(0);

      // Postgres RLS silently excludes rows that fail the policy's USING
      // clause rather than raising an error, so a blocked write returns
      // HTTP 200 with zero affected rows, not a PostgREST error. Assert on
      // the affected-row count (via .select()) rather than on an error.
      const { data: writeData, error: writeError } = await supabase
        .from('vehicles')
        .update({ remarks: 'should not be allowed' })
        .eq('plate_no', 'U 67931')
        .select();
      expect(writeError).toBeNull();
      expect(writeData).toEqual([]);
    } finally {
      await signOutTestUser();
      await deleteTestUser(viewer.id);
    }
  });

  it('denies reads immediately after a user is deactivated mid-session', async () => {
    const viewer = await createTestUser('viewer');
    try {
      await signInAsTestUser(viewer);
      const { data: before, error: beforeError } = await supabase.from('vehicles').select('*');
      expect(beforeError).toBeNull();
      expect(before!.length).toBeGreaterThan(0);

      await setTestUserActive(viewer.id, false);

      const { data: after, error: afterError } = await supabase.from('vehicles').select('*');
      expect(afterError).toBeNull();
      expect(after).toEqual([]);
    } finally {
      await signOutTestUser();
      await deleteTestUser(viewer.id);
    }
  });

  it('lets an Admin write, unlike a Viewer', async () => {
    const admin = await createTestUser('admin');
    try {
      await signInAsTestUser(admin);
      const { data, error } = await supabase
        .from('vehicles')
        .update({ remarks: 'admin test write' })
        .eq('plate_no', 'U 67931')
        .select();
      expect(error).toBeNull();
      expect(data!.length).toBe(1);
      // Revert the test write so it doesn't pollute other tests/data.
      await supabase.from('vehicles').update({ remarks: null }).eq('plate_no', 'U 67931');
    } finally {
      await signOutTestUser();
      await deleteTestUser(admin.id);
    }
  });
});
