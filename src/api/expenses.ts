import { supabase } from '../lib/supabaseClient';
import type { Expense } from '../types';

export async function fetchExpensesByVehicle(vehicleId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data as Expense[];
}

export async function fetchUnassignedExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .is('vehicle_id', null)
    .order('date', { ascending: false });
  if (error) throw error;
  return data as Expense[];
}

export async function fetchAllExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
  if (error) throw error;
  return data as Expense[];
}
