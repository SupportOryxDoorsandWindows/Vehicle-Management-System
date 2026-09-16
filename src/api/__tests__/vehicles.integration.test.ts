import { describe, it, expect } from 'vitest';
import { fetchVehicles, fetchVehicleById } from '../vehicles';

describe('vehicles API (integration, real Supabase project)', () => {
  it('fetches all 53 seeded vehicles ordered by plate_no', async () => {
    const vehicles = await fetchVehicles();
    expect(vehicles).toHaveLength(53);
    expect(vehicles[0].plate_no <= vehicles[1].plate_no).toBe(true);
  });

  it('fetches the known U 67931 Ford Ranger by id', async () => {
    const vehicles = await fetchVehicles();
    const ranger = vehicles.find((v) => v.plate_no === 'U 67931')!;
    const byId = await fetchVehicleById(ranger.id);
    expect(byId?.brand).toBe('Ford');
    expect(byId?.model).toBe('Ranger 2021');
  });

  it('returns null for an unknown id', async () => {
    const result = await fetchVehicleById('00000000-0000-0000-0000-000000000000');
    expect(result).toBeNull();
  });
});
