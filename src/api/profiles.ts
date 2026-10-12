import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('email');
  if (error) throw error;
  return data as Profile[];
}

// RLS turns an update the caller isn't allowed to make into a no-op rather than
// an error, so ask for the updated row back and treat "no rows" as a failure.
async function updateProfile(id: string, changes: Partial<Pick<Profile, 'role' | 'active'>>) {
  const { data, error } = await supabase.from('profiles').update(changes).eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("The change wasn't saved. Your account may no longer have admin access.");
  }
}

export async function updateProfileRole(id: string, role: 'admin' | 'viewer'): Promise<void> {
  await updateProfile(id, { role });
}

export async function setProfileActive(id: string, active: boolean): Promise<void> {
  await updateProfile(id, { active });
}
