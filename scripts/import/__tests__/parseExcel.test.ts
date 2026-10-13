import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import { readSheetAsObjects, mapRow, excelSerialToIsoDate } from '../parseExcel';
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

describe('dates', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  // The sheet displays DD 18409 as registered 24-Feb-2025, licence expiring 16-Mar-2027.
  // The original import ran in Asia/Dubai, where reading dates as JS Dates shifted
  // every one of them back a day.
  for (const tz of ['Asia/Dubai', 'UTC', 'America/New_York', 'Asia/Kolkata']) {
    it(`reads calendar dates exactly as the sheet shows them (TZ=${tz})`, () => {
      process.env.TZ = tz;
      const rows = readSheetAsObjects(VEHICLE_FILE, 'Vehicle_Report').map((r) =>
        mapRow(r, VEHICLE_COLUMN_MAP)
      );
      const crane = rows.find((r) => String(r.plate_no).trim() === 'DD 18409');
      expect(crane?.registration_date).toBe('2025-02-24');
      expect(crane?.vehicle_license_expiry_date).toBe('2027-03-16');
    });
  }

  it('converts Excel serial day numbers to ISO dates, ignoring any time of day', () => {
    expect(excelSerialToIsoDate(45712)).toBe('2025-02-24');
    expect(excelSerialToIsoDate(45712.99)).toBe('2025-02-24');
    expect(excelSerialToIsoDate(25569)).toBe('1970-01-01');
  });
});
