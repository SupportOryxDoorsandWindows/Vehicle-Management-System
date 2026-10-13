import { describe, it, expect } from 'vitest';
import * as XLSXModule from 'xlsx';
import writeXlsxFile from 'write-excel-file/browser';
import { buildSheet, exportFileName, toWorkbookSheets, type ExportColumn } from '../exportExcel';

// Same interop shim as scripts/import/parseExcel.ts.
const XLSX: typeof XLSXModule =
  typeof (XLSXModule as { read?: unknown }).read === 'function'
    ? XLSXModule
    : ((XLSXModule as unknown as { default: typeof XLSXModule }).default ?? XLSXModule);

interface Row {
  name: string | null;
  cost: number | null;
  date: string | null;
}
const columns: ExportColumn<Row>[] = [
  { header: 'Name', value: (r) => r.name },
  { header: 'Cost (AED)', kind: 'money', value: (r) => r.cost },
  { header: 'Date', kind: 'date', value: (r) => r.date },
];
const rows: Row[] = [
  { name: 'Oil change', cost: 1250.5, date: '2026-03-09' },
  { name: null, cost: null, date: null },
];

describe('buildSheet / toWorkbookSheets', () => {
  it('makes a bold, frozen header row and typed cells', () => {
    const [sheet] = toWorkbookSheets([buildSheet('Expenses', columns, rows)]);
    expect(sheet.sheet).toBe('Expenses');
    expect(sheet.stickyRowsCount).toBe(1);
    expect(sheet.data[0]).toEqual([
      { value: 'Name', fontWeight: 'bold' },
      { value: 'Cost (AED)', fontWeight: 'bold' },
      { value: 'Date', fontWeight: 'bold' },
    ]);
    expect(sheet.data[1]).toEqual([
      { value: 'Oil change', type: String },
      { value: 1250.5, type: Number, format: '#,##0.00' },
      { value: new Date(Date.UTC(2026, 2, 9)), type: Date, format: 'dd/mm/yyyy' },
    ]);
    expect(sheet.data[2]).toEqual([null, null, null]);
  });

  it('keeps unparseable dates as text and truncates long sheet names', () => {
    const [sheet] = toWorkbookSheets([
      buildSheet('A very long sheet name that Excel would reject', columns, [{ name: 'x', cost: 1, date: 'TBC' }]),
    ]);
    expect(sheet.sheet).toHaveLength(31);
    expect(sheet.data[1][2]).toEqual({ value: 'TBC', type: String });
  });
});

describe('exportFileName', () => {
  it('slugs the name and adds the local date', () => {
    expect(exportFileName('U 67931 expenses', new Date(2026, 9, 13))).toBe('u-67931-expenses-2026-10-13.xlsx');
    expect(exportFileName('###', new Date(2026, 0, 2))).toBe('export-2026-01-02.xlsx');
  });
});

describe('generated workbook', () => {
  it('opens in Excel with numbers as numbers and dates as dates', async () => {
    const blob = await writeXlsxFile(toWorkbookSheets([buildSheet('Expenses', columns, rows)])).toBlob();
    const workbook = XLSX.read(new Uint8Array(await blob.arrayBuffer()), { cellDates: true });

    expect(workbook.SheetNames).toEqual(['Expenses']);
    const sheet = workbook.Sheets.Expenses;
    expect(sheet.A1.v).toBe('Name');
    expect(sheet.A2.v).toBe('Oil change');
    expect(sheet.B2.t).toBe('n');
    expect(sheet.B2.v).toBe(1250.5);
    expect(sheet.C2.t).toBe('d');
    expect((sheet.C2.v as Date).toISOString().slice(0, 10)).toBe('2026-03-09');
    expect(sheet.A3).toBeUndefined(); // blanks stay empty
  });
});
