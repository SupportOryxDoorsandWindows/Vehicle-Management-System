import { describe, it, expect } from 'vitest';
import { normalizePlate, extractPlateFromVehicleNumberField } from '../normalize';

describe('normalizePlate', () => {
  it('trims, collapses whitespace, and uppercases', () => {
    expect(normalizePlate('  cc 16257  ')).toBe('CC 16257');
    expect(normalizePlate('U   67931')).toBe('U 67931');
  });
});

describe('extractPlateFromVehicleNumberField', () => {
  it('extracts and normalizes the plate before " - "', () => {
    expect(extractPlateFromVehicleNumberField('AA 26891 - Leo Mungcal')).toBe('AA 26891');
    expect(extractPlateFromVehicleNumberField('U 67938 - Lorna Sibanda ')).toBe('U 67938');
  });

  it('returns null for empty input', () => {
    expect(extractPlateFromVehicleNumberField(null)).toBeNull();
    expect(extractPlateFromVehicleNumberField('')).toBeNull();
  });
});
