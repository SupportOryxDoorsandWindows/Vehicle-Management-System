import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { readSheetAsObjects, mapRow } from '../parseExcel';
import { VEHICLE_COLUMN_MAP, EXPENSE_COLUMN_MAP } from '../columnMaps';

const VEHICLE_FILE = path.resolve(__dirname, '../../../data/source/Vehicle Report.xlsx');
const EXPENSE_FILE = path.resolve(__dirname, '../../../data/source/All Expenses.xlsx');

describe('readSheetAsObjects + mapRow on real source files', () => {
  it('reads all 53 vehicle rows and maps the known U 67931 Ford Ranger row', () => {
    const rows = readSheetAsObjects(VEHICLE_FILE, 'Vehicle_Report').map((r) =>
      mapRow(r, VEHICLE_COLUMN_MAP)
    );
    expect(rows).toHaveLength(53);
    const ranger = rows.find((r) => String(r.plate_no).trim() === 'U 67931');
    expect(ranger).toBeTruthy();
    expect(ranger?.brand).toBe('Ford');
    expect(ranger?.model).toBe('Ranger 2021');
    expect(ranger?.department).toBe('Installation');
  });

  it('reads all 54 expense rows and maps a known vehicle-linked row', () => {
    const rows = readSheetAsObjects(EXPENSE_FILE, 'All_Quartermaster_Expenses').map((r) =>
      mapRow(r, EXPENSE_COLUMN_MAP)
    );
    expect(rows).toHaveLength(54);
    const insuranceRow = rows.find((r) => r.expense === 'Vehicle Insurance');
    expect(insuranceRow).toBeTruthy();
    expect(insuranceRow?.type_of_expense).toBe('Service');
  });

  it('converts empty strings to null', () => {
    const rows = readSheetAsObjects(VEHICLE_FILE, 'Vehicle_Report').map((r) =>
      mapRow(r, VEHICLE_COLUMN_MAP)
    );
    const withBlankRemarks = rows.find((r) => r.remarks === null);
    expect(withBlankRemarks).toBeTruthy();
  });
});
