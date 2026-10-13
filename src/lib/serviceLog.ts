import { getDocumentStatus } from './documentStatus';
import type { FieldGroup } from './recordForm';
import type { ServiceKind, ServiceRecord } from '../types';

export const SERVICE_KINDS: { value: ServiceKind; label: string }[] = [
  { value: 'service', label: 'Service' },
  { value: 'repair', label: 'Repair' },
  { value: 'tyres', label: 'Tyres' },
  { value: 'battery', label: 'Battery' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'reading', label: 'Odometer reading only' },
  { value: 'other', label: 'Other' },
];

export function serviceKindLabel(kind: ServiceKind): string {
  return SERVICE_KINDS.find((k) => k.value === kind)?.label ?? kind;
}

/** A service due by mileage counts as "Due Soon" within this many KM. */
export const SERVICE_DUE_SOON_KM = 1000;

export type ServiceDueStatus = 'overdue' | 'due_soon' | 'ok';

export interface ServiceSummary {
  /** The latest odometer reading, from any kind of record. */
  odometer: { km: number; date: string } | null;
  /** The latest record of kind "service". */
  lastService: ServiceRecord | null;
  /** From the latest record that sets a next service date or KM. */
  nextService: { date: string | null; km: number | null; status: ServiceDueStatus } | null;
}

function newestFirst(a: ServiceRecord, b: ServiceRecord): number {
  if (a.record_date !== b.record_date) return a.record_date < b.record_date ? 1 : -1;
  return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;
}

const RANK: Record<ServiceDueStatus, number> = { ok: 0, due_soon: 1, overdue: 2 };

export function summarizeServiceLog(
  records: ServiceRecord[],
  asOf: Date,
  dueSoonDays: number
): ServiceSummary {
  const sorted = [...records].sort(newestFirst);
  const reading = sorted.find((r) => r.odometer_km != null);
  const odometer = reading ? { km: reading.odometer_km as number, date: reading.record_date } : null;
  const lastService = sorted.find((r) => r.kind === 'service') ?? null;
  const next = sorted.find((r) => r.next_service_date != null || r.next_service_km != null);

  let nextService: ServiceSummary['nextService'] = null;
  if (next) {
    let status: ServiceDueStatus = 'ok';
    const byDate = getDocumentStatus(next.next_service_date, asOf, dueSoonDays);
    if (byDate === 'expired') status = 'overdue';
    else if (byDate === 'expiring_soon') status = 'due_soon';
    if (next.next_service_km != null && odometer) {
      const remaining = next.next_service_km - odometer.km;
      const byKm: ServiceDueStatus = remaining <= 0 ? 'overdue' : remaining <= SERVICE_DUE_SOON_KM ? 'due_soon' : 'ok';
      if (RANK[byKm] > RANK[status]) status = byKm;
    }
    nextService = { date: next.next_service_date, km: next.next_service_km, status };
  }
  return { odometer, lastService, nextService };
}

export function formatKm(km: number | null): string {
  return km == null ? 'Not Available' : `${km.toLocaleString('en-AE')} KM`;
}

export const SERVICE_FIELD_GROUPS: FieldGroup[] = [
  {
    title: 'Record',
    fields: [
      { name: 'record_date', label: 'Date', type: 'date', required: true },
      { name: 'kind', label: 'Type', type: 'select', required: true, options: SERVICE_KINDS },
      { name: 'odometer_km', label: 'Odometer (KM)', type: 'number', min: 0 },
      { name: 'garage', label: 'Garage', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    title: 'Next Service',
    fields: [
      { name: 'next_service_date', label: 'Next service date', type: 'date' },
      { name: 'next_service_km', label: 'Next service (KM)', type: 'number', min: 0 },
    ],
  },
];

/** Today as YYYY-MM-DD in local time (toISOString would give UTC's date). */
export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
