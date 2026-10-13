import { supabase } from '../lib/supabaseClient';
import type { Expense } from '../types';
import { NOT_SAVED_MESSAGE } from './errors';
import { deleteRow } from './deleteRow';

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

export async function fetchExpenseById(id: string): Promise<Expense | null> {
  const { data, error } = await supabase.from('expenses').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Expense | null;
}

export type ExpenseInput = Partial<Omit<Expense, 'id' | 'created_at'>>;

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const { data, error } = await supabase.from('expenses').insert(input).select().single();
  if (error) throw error;
  return data as Expense;
}

// A change of vehicle_id is written to expense_assignment_audit by a database
// trigger, so assignment needs no separate audit call here.
export async function updateExpense(id: string, input: ExpenseInput): Promise<Expense> {
  const { data, error } = await supabase.from('expenses').update(input).eq('id', id).select().maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(NOT_SAVED_MESSAGE);
  return data as Expense;
}

export async function assignExpenseToVehicle(expenseId: string, vehicleId: string): Promise<Expense> {
  return updateExpense(expenseId, { vehicle_id: vehicleId });
}

/** Its attachments are deleted with it; its assignment history stays, with the expense left blank. */
export async function deleteExpense(id: string): Promise<void> {
  await deleteRow('expenses', id);
}
