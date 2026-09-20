import { supabase } from '../lib/supabaseClient';
import type { TestUser } from './testAuthHelpers';

/** Signs the app's shared Supabase client in as the given test user. */
export async function signInAsTestUser(user: TestUser): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw error;
}

export async function signOutTestUser(): Promise<void> {
  await supabase.auth.signOut();
}
