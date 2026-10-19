import type { AttentionTone } from '../lib/vehicleAttention';

// Shared class lists for the Oryx Fleet look, so pages don't drift apart.
export const BUTTON =
  'inline-flex items-center justify-center h-11 px-4 rounded-lg border border-oryx-field bg-white font-medium text-oryx-ink hover:bg-oryx-soft disabled:opacity-50';
export const BUTTON_PRIMARY =
  'inline-flex items-center justify-center h-11 px-4 rounded-lg bg-oryx-blue font-medium text-white hover:bg-oryx-blue-hover disabled:opacity-50';
export const BUTTON_SMALL =
  'inline-flex items-center justify-center h-10 px-3.5 rounded-lg border border-oryx-field bg-white font-medium text-oryx-ink hover:bg-oryx-soft';
export const BUTTON_SMALL_PRIMARY =
  'inline-flex items-center justify-center h-10 px-3.5 rounded-lg bg-oryx-blue font-medium text-white hover:bg-oryx-blue-hover';
export const CARD = 'bg-white border border-oryx-line rounded-xl';
export const LINK = 'text-oryx-blue hover:text-oryx-blue-hover underline-offset-2 hover:underline';

export const TONE_CLASSES: Record<AttentionTone, string> = {
  red: 'text-oryx-red bg-oryx-red-bg',
  amber: 'text-oryx-amber bg-oryx-amber-bg',
  green: 'text-oryx-green bg-oryx-green-bg',
  neutral: 'text-oryx-muted bg-oryx-track',
};
