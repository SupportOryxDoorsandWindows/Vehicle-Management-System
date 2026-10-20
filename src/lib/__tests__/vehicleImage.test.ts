import { describe, expect, it } from 'vitest';
import { getVehicleImagePath } from '../vehicleImage';

const base = import.meta.env.BASE_URL;

describe('getVehicleImagePath', () => {
  it('uses a plate-specific image when the vehicle has one', () => {
    expect(getVehicleImagePath('Mobile Crane 2025', 'DD 18409')).toBe(`${base}vehicle-images/dd-18409.jpg`);
    expect(getVehicleImagePath('Mobile Crane 2025', 'DD 18410')).toBe(`${base}vehicle-images/dd-18410.jpg`);
  });

  it('ignores spacing and case in the plate', () => {
    expect(getVehicleImagePath(null, 'dd18410')).toBe(`${base}vehicle-images/dd-18410.jpg`);
  });

  it('falls back to the model image when the plate has none', () => {
    expect(getVehicleImagePath('Hilux 2025', 'EE 34759')).toBe(`${base}vehicle-images/toyota-hilux.png`);
  });

  it('returns null when neither plate nor model matches', () => {
    expect(getVehicleImagePath('Mobile Crane 2025', 'DD 99999')).toBeNull();
    expect(getVehicleImagePath(null)).toBeNull();
  });
});
