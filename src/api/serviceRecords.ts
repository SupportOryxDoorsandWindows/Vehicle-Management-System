import { supabase } from '../lib/supabaseClient';
import type { ServiceRecord } from '../types';
import { NOT_SAVED_MESSAGE } from './errors';
import { deleteRow } from './deleteRow';

/** Newest first; records on the same day in the order they were entered, latest first. */
export async function fetchServiceRecords(vehicleId: string): Promise<ServiceRecord[]> {
  const { data, error } = await supabase
    .from('service_records')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('record_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ServiceRecord[];
}

export async function fetchAllServiceRecords(): Promise<ServiceRecord[]> {
  const { data, error } = await supabase
    .from('service_records')
    .select('*')
    .order('record_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ServiceRecord[];
}

export type ServiceRecordInput = Partial<Omit<ServiceRecord, 'id' | 'created_by' | 'created_at'>>;

export async function createServiceRecord(input: ServiceRecordInput): Promise<ServiceRecord> {
  const { data, error } = await supabase.from('service_records').insert(input).select().single();
  if (error) throw error;
  return data as ServiceRecord;
}

export async function updateServiceRecord(id: string, input: ServiceRecordInput): Promise<ServiceRecord> {
  const { data, error } = await supabase
    .from('service_records')
    .update(input)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(NOT_SAVED_MESSAGE);
  return data as ServiceRecord;
}

export async function deleteServiceRecord(id: string): Promise<void> {
  await deleteRow('service_records', id);
}
