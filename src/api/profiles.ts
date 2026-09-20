import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('email');
  if (error) throw error;
  return data as Profile[];
}

export async function updateProfileRole(id: string, role: 'admin' | 'viewer'): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
  if (error) throw error;
}

export async function setProfileActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ active }).eq('id', id);
  if (error) throw error;
}
