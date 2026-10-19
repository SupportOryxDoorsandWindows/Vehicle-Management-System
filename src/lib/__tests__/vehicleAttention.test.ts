import { describe, it, expect } from 'vitest';
import { vehicleAttention, needsAttention } from '../vehicleAttention';
import type { Vehicle } from '../../types';

const asOf = new Date('2026-10-14T00:00:00Z');
const vehicle = (expiry: string | null, status: Vehicle['status'] = 'active') =>
  ({ id: 'v', plate_no: 'E 97818', status, vehicle_license_expiry_date: expiry }) as Vehicle;

describe('vehicleAttention', () => {
  it('shows a licence expiring within a week in red, with the days left', () => {
    expect(vehicleAttention(vehicle('2026-10-17'), asOf, 30)).toMatchObject({
      tone: 'red',
      label: 'Licence expires in 3 days',
      daysLeft: 3,
    });
    expect(vehicleAttention(vehicle('2026-10-14'), asOf, 30).label).toBe('Licence expires today');
    expect(vehicleAttention(vehicle('2026-10-15'), asOf, 30).label).toBe('Licence expires tomorrow');
  });

  it('shows an expired licence in red', () => {
    expect(vehicleAttention(vehicle('2026-10-01'), asOf, 30)).toMatchObject({ tone: 'red', label: 'Licence expired' });
  });

  it('shows a licence due later within the Expiring Soon days in amber', () => {
    expect(vehicleAttention(vehicle('2026-10-28'), asOf, 30)).toMatchObject({ tone: 'amber', label: 'Licence due soon' });
    expect(vehicleAttention(vehicle('2026-10-28'), asOf, 7)).toMatchObject({ tone: 'green', label: 'Active' });
  });

  it('shows Active when the licence is fine or has no date, and Inactive for inactive vehicles', () => {
    expect(vehicleAttention(vehicle('2027-08-11'), asOf, 30).label).toBe('Active');
    expect(vehicleAttention(vehicle(null), asOf, 30).label).toBe('Active');
    expect(vehicleAttention(vehicle('2026-10-01', 'inactive'), asOf, 30)).toMatchObject({ tone: 'neutral', label: 'Inactive' });
  });

  it('ranks red before amber before the rest', () => {
    const [red, amber, ok, inactive] = ['2026-10-17', '2026-10-28', null, null].map((d, i) =>
      vehicleAttention(vehicle(d, i === 3 ? 'inactive' : 'active'), asOf, 30)
    );
    expect(red.rank).toBeGreaterThan(amber.rank);
    expect(amber.rank).toBeGreaterThan(ok.rank);
    expect(ok.rank).toBeGreaterThan(inactive.rank);
    expect([red, amber, ok, inactive].map(needsAttention)).toEqual([true, true, false, false]);
  });
});
