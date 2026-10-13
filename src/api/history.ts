import { supabase } from '../lib/supabaseClient';

export const HISTORY_LIMIT = 500;

export interface AssignmentHistoryEntry {
  id: string;
  assigned_at: string;
  /** auth user id as text, or 'system' for changes made outside the app. */
  assigned_by: string;
  expense: { id: string; date: string | null; expense: string | null; cost: number | null } | null;
  previous: { id: string; plate_no: string } | null;
  assigned: { id: string; plate_no: string } | null;
}

/** Newest first, capped at HISTORY_LIMIT rows. */
export async function fetchAssignmentHistory(): Promise<AssignmentHistoryEntry[]> {
  const { data, error } = await supabase
    .from('expense_assignment_audit')
    .select(
      `id, assigned_at, assigned_by,
       expense:expenses!expense_assignment_audit_expense_id_fkey(id, date, expense, cost),
       previous:vehicles!expense_assignment_audit_previous_vehicle_id_fkey(id, plate_no),
       assigned:vehicles!expense_assignment_audit_assigned_vehicle_id_fkey(id, plate_no)`
    )
    .order('assigned_at', { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw error;
  return data as unknown as AssignmentHistoryEntry[];
}
