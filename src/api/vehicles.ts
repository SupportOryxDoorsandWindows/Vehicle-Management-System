import { supabase } from '../lib/supabaseClient';
import type { Vehicle } from '../types';

export async function fetchVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase.from('vehicles').select('*').order('plate_no');
  if (error) throw error;
  return data as Vehicle[];
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchVehicleById(id: string): Promise<Vehicle | null> {
  // A malformed id (e.g. a mistyped URL) can't match any vehicle, and sending it
  // would make Postgres reject the uuid cast with an error instead of "not found".
  if (!UUID_PATTERN.test(id)) return null;
  const { data, error } = await supabase.from('vehicles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Vehicle | null;
}
