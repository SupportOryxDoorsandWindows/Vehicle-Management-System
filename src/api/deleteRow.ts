import { supabase } from '../lib/supabaseClient';
import { NOT_SAVED_MESSAGE } from './errors';

/**
 * Deletes one row by id. RLS turns a forbidden delete into "0 rows" rather
 * than an error, so that counts as a failure too. The database keeps a copy
 * of the deleted row in deleted_records.
 */
export async function deleteRow(table: 'vehicles' | 'expenses' | 'service_records', id: string): Promise<void> {
  const { data, error } = await supabase.from(table).delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(NOT_SAVED_MESSAGE);
}

/** Postgres foreign_key_violation: something still refers to the row. */
export function isStillReferenced(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === '23503';
}
