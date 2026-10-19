import type { Vehicle } from '../types';
import { getDocumentStatus } from './documentStatus';

/** Licence expiring within this many days is shown in red, not amber. */
export const URGENT_DAYS = 7;

export type AttentionTone = 'red' | 'amber' | 'green' | 'neutral';

export interface VehicleAttention {
  tone: AttentionTone;
  label: string;
  /** Higher sorts first under "Needs attention first". */
  rank: number;
  /** Days until the licence expires (negative once expired); null if no date. */
  daysLeft: number | null;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function daysUntil(isoDate: string, asOf: Date): number {
  return Math.floor((new Date(isoDate).getTime() - asOf.getTime()) / MS_PER_DAY);
}

export function licenceDueText(daysLeft: number): string {
  if (daysLeft < 0) return 'Licence expired';
  if (daysLeft === 0) return 'Licence expires today';
  if (daysLeft === 1) return 'Licence expires tomorrow';
  return `Licence expires in ${daysLeft} days`;
}

/** What a vehicle's card leads with: its licence if it needs renewing, otherwise its status. */
export function vehicleAttention(vehicle: Vehicle, asOf: Date, expiringSoonDays: number): VehicleAttention {
  const expiry = vehicle.vehicle_license_expiry_date;
  const daysLeft = expiry ? daysUntil(expiry, asOf) : null;
  if (vehicle.status === 'inactive') return { tone: 'neutral', label: 'Inactive', rank: 0, daysLeft };

  const status = getDocumentStatus(expiry, asOf, expiringSoonDays);
  if (daysLeft !== null && status === 'expired') {
    return { tone: 'red', label: licenceDueText(daysLeft), rank: 3, daysLeft };
  }
  if (daysLeft !== null && status === 'expiring_soon') {
    return daysLeft <= URGENT_DAYS
      ? { tone: 'red', label: licenceDueText(daysLeft), rank: 3, daysLeft }
      : { tone: 'amber', label: 'Licence due soon', rank: 2, daysLeft };
  }
  return { tone: 'green', label: 'Active', rank: 1, daysLeft };
}

export function needsAttention(attention: VehicleAttention): boolean {
  return attention.tone === 'red' || attention.tone === 'amber';
}
