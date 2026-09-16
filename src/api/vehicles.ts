import { supabase } from '../lib/supabaseClient';
import type { Vehicle } from '../types';

export async function fetchVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase.from('vehicles').select('*').order('plate_no');
  if (error) throw error;
  return data as Vehicle[];
}

export async function fetchVehicleById(id: string): Promise<Vehicle | null> {
  const { data, error } = await supabase.from('vehicles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Vehicle | null;
}
