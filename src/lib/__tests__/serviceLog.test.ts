import { describe, it, expect } from 'vitest';
import { formatKm, summarizeServiceLog } from '../serviceLog';
import type { ServiceRecord } from '../../types';

const asOf = new Date('2026-10-13T00:00:00Z');

function record(overrides: Partial<ServiceRecord>): ServiceRecord {
  return {
    id: 'r', vehicle_id: 'v1', record_date: '2026-01-01', kind: 'service', odometer_km: null,
    garage: null, description: null, next_service_date: null, next_service_km: null,
    created_by: null, created_at: '2026-01-01T00:00:00Z', ...overrides,
  };
}

describe('summarizeServiceLog', () => {
  it('is empty without records', () => {
    expect(summarizeServiceLog([], asOf, 30)).toEqual({ odometer: null, lastService: null, nextService: null });
  });

  it('takes the odometer from the latest record of any kind, and the last service from service records only', () => {
    const service = record({ id: 's', record_date: '2026-08-01', odometer_km: 120000 });
    const reading = record({ id: 'r', record_date: '2026-10-01', kind: 'reading', odometer_km: 124500 });
    const tyres = record({ id: 't', record_date: '2026-09-01', kind: 'tyres' });
    const summary = summarizeServiceLog([service, tyres, reading], asOf, 30);
    expect(summary.odometer).toEqual({ km: 124500, date: '2026-10-01' });
    expect(summary.lastService?.id).toBe('s');
  });

  it('orders records on the same day by when they were entered', () => {
    const first = record({ id: 'a', record_date: '2026-10-01', kind: 'reading', odometer_km: 100, created_at: '2026-10-01T08:00:00Z' });
    const second = record({ id: 'b', record_date: '2026-10-01', kind: 'reading', odometer_km: 200, created_at: '2026-10-01T09:00:00Z' });
    expect(summarizeServiceLog([first, second], asOf, 30).odometer?.km).toBe(200);
  });

  it('takes the next service from the latest record that sets one', () => {
    const service = record({ record_date: '2026-08-01', next_service_date: '2027-02-01', next_service_km: 130000 });
    const repair = record({ record_date: '2026-09-01', kind: 'repair' });
    expect(summarizeServiceLog([repair, service], asOf, 30).nextService).toEqual({
      date: '2027-02-01', km: 130000, status: 'ok',
    });
  });

  it('is due soon or overdue by date, using the configured days', () => {
    const soon = record({ next_service_date: '2026-11-01' });
    expect(summarizeServiceLog([soon], asOf, 30).nextService?.status).toBe('due_soon');
    expect(summarizeServiceLog([soon], asOf, 10).nextService?.status).toBe('ok');
    const past = record({ next_service_date: '2026-10-01' });
    expect(summarizeServiceLog([past], asOf, 30).nextService?.status).toBe('overdue');
  });

  it('is due soon within 1,000 KM and overdue once the odometer reaches it', () => {
    const service = record({ record_date: '2026-08-01', odometer_km: 120000, next_service_km: 130000 });
    const at = (km: number) =>
      summarizeServiceLog([service, record({ record_date: '2026-10-01', kind: 'reading', odometer_km: km })], asOf, 30)
        .nextService?.status;
    expect(at(128999)).toBe('ok');
    expect(at(129000)).toBe('due_soon');
    expect(at(130000)).toBe('overdue');
  });

  it('reports the worse of date and mileage', () => {
    const service = record({ odometer_km: 129500, next_service_km: 130000, next_service_date: '2026-09-01' });
    expect(summarizeServiceLog([service], asOf, 30).nextService?.status).toBe('overdue');
  });

  it('cannot judge mileage without any odometer reading', () => {
    const service = record({ next_service_km: 130000 });
    expect(summarizeServiceLog([service], asOf, 30).nextService?.status).toBe('ok');
  });
});

describe('formatKm', () => {
  it('formats kilometres', () => {
    expect(formatKm(309867)).toBe('309,867 KM');
    expect(formatKm(null)).toBe('Not Available');
  });
});
