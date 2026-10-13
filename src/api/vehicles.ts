import { supabase } from '../lib/supabaseClient';
import type { Vehicle } from '../types';
import { NOT_SAVED_MESSAGE } from './errors';
import { deleteRow } from './deleteRow';

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

export type VehicleInput = Partial<Omit<Vehicle, 'id' | 'created_at'>>;

export async function createVehicle(input: VehicleInput): Promise<Vehicle> {
  const { data, error } = await supabase.from('vehicles').insert(input).select().single();
  if (error) throw error;
  return data as Vehicle;
}

export async function updateVehicle(id: string, input: VehicleInput): Promise<Vehicle> {
  const { data, error } = await supabase.from('vehicles').update(input).eq('id', id).select().maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(NOT_SAVED_MESSAGE);
  return data as Vehicle;
}

/** Refused by the database (isStillReferenced) while the vehicle has expenses or assignment history. */
export async function deleteVehicle(id: string): Promise<void> {
  await deleteRow('vehicles', id);
}
