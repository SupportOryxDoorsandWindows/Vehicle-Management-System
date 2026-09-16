import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { buildSeedData } from '../buildSeedData';

const VEHICLE_FILE = path.resolve(__dirname, '../../../data/source/Vehicle Report.xlsx');
const EXPENSE_FILE = path.resolve(__dirname, '../../../data/source/All Expenses.xlsx');

describe('buildSeedData', () => {
  it('matches the hand-verified import summary from the real source files', () => {
    const { summary } = buildSeedData(VEHICLE_FILE, EXPENSE_FILE);
    expect(summary).toEqual({
      vehiclesImported: 53,
      expensesImported: 54,
      matchedExpenses: 31,
      unassignedExpenses: 23,
      recordsRequiringReview: 0,
    });
  });

  it('assigns every vehicle and expense a unique id, and links matched expenses to the right vehicle', () => {
    const { vehicles, expenses } = buildSeedData(VEHICLE_FILE, EXPENSE_FILE);
    const ids = new Set([...vehicles.map((v) => v.id), ...expenses.map((e) => e.id)]);
    expect(ids.size).toBe(vehicles.length + expenses.length);

    const ranger = vehicles.find((v) => v.plate_no === 'U 67931');
    const insuranceForOtherVehicle = expenses.find(
      (e) => e.raw_vehicle_number_text === 'AA 26891 - Leo Mungcal'
    );
    const rangerVehicle = vehicles.find((v) => v.id === insuranceForOtherVehicle?.vehicle_id);
    expect(rangerVehicle?.plate_no).toBe('AA 26891');
    expect(ranger).toBeTruthy();
  });
});
