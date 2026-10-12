import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';
import { NOT_SAVED_MESSAGE } from './errors';

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('email');
  if (error) throw error;
  return data as Profile[];
}

async function updateProfile(id: string, changes: Partial<Pick<Profile, 'role' | 'active'>>) {
  const { data, error } = await supabase.from('profiles').update(changes).eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(NOT_SAVED_MESSAGE);
  }
}

export async function updateProfileRole(id: string, role: 'admin' | 'viewer'): Promise<void> {
  await updateProfile(id, { role });
}

export async function setProfileActive(id: string, active: boolean): Promise<void> {
  await updateProfile(id, { active });
}
