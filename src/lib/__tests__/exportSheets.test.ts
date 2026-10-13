import { describe, it, expect } from 'vitest';
import { expensesSheet, fleetReportSheets, vehicleRegisterSheet } from '../exportSheets';
import type { Expense, Vehicle } from '../../types';

const vehicles = [
  { id: 'v1', plate_no: 'U 67931', brand: 'Ford', model: 'Ranger 2021', status: 'active', vehicle_license_expiry_date: '2026-11-01' },
  { id: 'v2', plate_no: 'CC 16257', brand: 'Toyota', model: 'Prado 2022', status: 'inactive', vehicle_license_expiry_date: null },
] as Vehicle[];
const expenses = [
  { id: 'e1', vehicle_id: 'v1', date: '2026-03-09', expense: 'Oil change', system_category: 'maintenance', cost: 350 },
  { id: 'e2', vehicle_id: null, date: '2026-04-01', expense: 'Uniforms', system_category: 'other', cost: 200 },
] as Expense[];

function column(sheet: { columns: { header: string }[]; rows: unknown[][] }, header: string) {
  const i = sheet.columns.findIndex((c) => c.header === header);
  expect(i).toBeGreaterThanOrEqual(0);
  return sheet.rows.map((r) => r[i]);
}

describe('vehicleRegisterSheet', () => {
  it('has one row per vehicle with its total, defaulting to 0', () => {
    const sheet = vehicleRegisterSheet(vehicles, new Map([['v1', 1250]]));
    expect(column(sheet, 'Plate')).toEqual(['U 67931', 'CC 16257']);
    expect(column(sheet, 'Total Expenses (AED)')).toEqual([1250, 0]);
    expect(column(sheet, 'Vehicle License Expiry')).toEqual(['2026-11-01', null]);
    expect(sheet.columns.find((c) => c.header === 'Vehicle License Expiry')?.kind).toBe('date');
  });
});

describe('expensesSheet', () => {
  it('adds a Vehicle column only when plates are given', () => {
    expect(expensesSheet('Expenses', expenses).columns.some((c) => c.header === 'Vehicle')).toBe(false);
    const sheet = expensesSheet('Expenses', expenses, new Map([['v1', 'U 67931']]));
    expect(column(sheet, 'Vehicle')).toEqual(['U 67931', 'Not assigned']);
    expect(column(sheet, 'Category')).toEqual(['Maintenance', 'Other']);
    expect(column(sheet, 'Cost (AED)')).toEqual([350, 200]);
  });
});

describe('fleetReportSheets', () => {
  it('produces Summary, By Category and Expenses sheets', () => {
    const sheets = fleetReportSheets({
      department: 'Installation',
      totalFleetExpenses: 350,
      unassignedTotal: 200,
      categories: [{ category: 'maintenance', amount: 350 }],
      expenses: [expenses[0]],
      vehicles,
    });
    expect(sheets.map((s) => s.name)).toEqual(['Summary', 'By Category', 'Expenses']);
    expect(sheets[0].rows).toEqual([
      ['Department', 'Installation'],
      ['Total Fleet Expenses (AED)', 350],
      ['Unassigned Expenses (AED)', 200],
    ]);
    expect(sheets[1].rows).toEqual([['Maintenance', 350]]);
    expect(column(sheets[2], 'Vehicle')).toEqual(['U 67931']);
  });

  it('labels an unfiltered report as all departments', () => {
    const [summary] = fleetReportSheets({
      department: '', totalFleetExpenses: 0, unassignedTotal: 0, categories: [], expenses: [], vehicles: [],
    });
    expect(summary.rows[0]).toEqual(['Department', 'All departments']);
  });
});
