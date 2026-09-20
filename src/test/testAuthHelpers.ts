import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(
  process.env.VITE_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

/** Creates a disposable, already-confirmed auth user plus a matching profiles row. */
export async function createTestUser(role: 'admin' | 'viewer'): Promise<TestUser> {
  const email = `test-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@oryxdoors.test`;
  const password = 'Test-Password-123!';
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({ id: data.user.id, email, role, active: true });
  if (profileError) throw profileError;
  return { id: data.user.id, email, password };
}

export async function deleteTestUser(id: string): Promise<void> {
  await adminClient.auth.admin.deleteUser(id);
}

export async function setTestUserActive(id: string, active: boolean): Promise<void> {
  const { error } = await adminClient.from('profiles').update({ active }).eq('id', id);
  if (error) throw error;
}
