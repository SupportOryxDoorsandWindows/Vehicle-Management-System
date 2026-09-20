import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { fetchVehicles } from '../vehicles';
import { fetchExpensesByVehicle, fetchUnassignedExpenses, fetchAllExpenses } from '../expenses';
import { createTestUser, deleteTestUser, type TestUser } from '../../test/testAuthHelpers';
import { signInAsTestUser, signOutTestUser } from '../../test/integrationAuthSetup';

let testUser: TestUser;

beforeAll(async () => {
  testUser = await createTestUser('admin');
  await signInAsTestUser(testUser);
});

afterAll(async () => {
  await signOutTestUser();
  await deleteTestUser(testUser.id);
});

describe('expenses API (integration, real Supabase project)', () => {
  it('fetches all 54 seeded expenses', async () => {
    const expenses = await fetchAllExpenses();
    expect(expenses).toHaveLength(54);
  });

  it('fetches the 23 unassigned expenses', async () => {
    const expenses = await fetchUnassignedExpenses();
    expect(expenses).toHaveLength(23);
    expect(expenses.every((e) => e.vehicle_id === null)).toBe(true);
  });

  it('fetches expenses for a specific vehicle', async () => {
    const vehicles = await fetchVehicles();
    const withPlate = vehicles.find((v) => v.plate_no === 'AA 26891')!;
    const expenses = await fetchExpensesByVehicle(withPlate.id);
    expect(expenses.length).toBeGreaterThan(0);
    expect(expenses.every((e) => e.vehicle_id === withPlate.id)).toBe(true);
  });
});
