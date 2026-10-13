import { supabase } from '../lib/supabaseClient';
import { NOT_SAVED_MESSAGE } from './errors';

export const DEFAULT_EXPIRING_SOON_DAYS = 30;
export const MIN_EXPIRING_SOON_DAYS = 1;
export const MAX_EXPIRING_SOON_DAYS = 365;

export interface AppSettings {
  expiring_soon_days: number;
  /** Set by the database on every change. */
  updated_by: string | null;
  updated_at: string;
}

/** Whole number in range, or an error message. */
export function parseExpiringSoonDays(raw: string): number | string {
  const value = raw.trim();
  const days = Number(value);
  if (!/^\d+$/.test(value) || days < MIN_EXPIRING_SOON_DAYS || days > MAX_EXPIRING_SOON_DAYS) {
    return `Enter a whole number of days between ${MIN_EXPIRING_SOON_DAYS} and ${MAX_EXPIRING_SOON_DAYS}.`;
  }
  return days;
}

const COLUMNS = 'expiring_soon_days, updated_by, updated_at';

export async function fetchSettings(): Promise<AppSettings> {
  const { data, error } = await supabase.from('app_settings').select(COLUMNS).eq('id', true).single();
  if (error) throw error;
  return data as AppSettings;
}

export async function updateExpiringSoonDays(days: number): Promise<AppSettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .update({ expiring_soon_days: days })
    .eq('id', true)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(NOT_SAVED_MESSAGE);
  return data as AppSettings;
}
