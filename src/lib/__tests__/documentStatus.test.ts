import { describe, it, expect } from 'vitest';
import { getDocumentStatus } from '../documentStatus';

describe('getDocumentStatus', () => {
  const asOf = new Date('2026-09-15T00:00:00.000Z');

  it('returns not_available when there is no expiry date', () => {
    expect(getDocumentStatus(null, asOf)).toBe('not_available');
  });

  it('returns expired for a past date', () => {
    expect(getDocumentStatus('2026-01-01', asOf)).toBe('expired');
  });

  it('returns expiring_soon within the default 30-day window', () => {
    expect(getDocumentStatus('2026-09-30', asOf)).toBe('expiring_soon');
  });

  it('returns valid for a date beyond the window', () => {
    expect(getDocumentStatus('2027-01-01', asOf)).toBe('valid');
  });

  it('respects a custom expiringSoonDays', () => {
    expect(getDocumentStatus('2026-10-01', asOf, 7)).toBe('valid');
    expect(getDocumentStatus('2026-09-20', asOf, 7)).toBe('expiring_soon');
  });
});
