import { describe, it, expect, afterEach } from 'vitest';
import { supabase } from '../../lib/supabaseClient';
import { createTestUser, deleteTestUser } from '../../test/testAuthHelpers';
import { signInAsTestUser, signOutTestUser } from '../../test/integrationAuthSetup';

let createdUserId: string | null = null;

afterEach(async () => {
  await signOutTestUser();
  if (createdUserId) {
    await deleteTestUser(createdUserId);
    createdUserId = null;
  }
});

describe('invite-user Edge Function (integration, real Supabase project)', () => {
  it('rejects an unauthenticated call', async () => {
    const { error } = await supabase.functions.invoke('invite-user', {
      body: { email: 'nobody@oryxdoors.test', role: 'viewer' },
      headers: { Authorization: '' },
    });
    expect(error).not.toBeNull();
  });

  it('rejects a Viewer calling it directly', async () => {
    const viewer = await createTestUser('viewer');
    try {
      await signInAsTestUser(viewer);
      const { error } = await supabase.functions.invoke('invite-user', {
        body: { email: 'nobody@oryxdoors.test', role: 'viewer' },
      });
      expect(error).not.toBeNull();
    } finally {
      await deleteTestUser(viewer.id);
    }
  });

  it('lets an Admin invite a new user, and rejects a duplicate email', async () => {
    const admin = await createTestUser('admin');
    const newEmail = `invited-${Date.now()}@oryxdoors.test`;
    try {
      await signInAsTestUser(admin);
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email: newEmail, role: 'viewer' },
      });
      expect(error).toBeNull();
      expect(data.email).toBe(newEmail);
      createdUserId = data.id;

      const { error: dupError } = await supabase.functions.invoke('invite-user', {
        body: { email: newEmail, role: 'viewer' },
      });
      expect(dupError).not.toBeNull();
    } finally {
      await deleteTestUser(admin.id);
    }
  });
});
