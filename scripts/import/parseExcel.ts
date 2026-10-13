import * as XLSXModule from 'xlsx';

// The xlsx package's ESM/CJS interop differs between bundled environments (Vite/Vitest)
// and native Node ESM (e.g. running via tsx): under native Node ESM, the named exports
// (readFile, utils, etc.) live on `.default` rather than on the namespace object itself.
// Resolve whichever shape actually has `readFile` so this works in both runtimes.
const XLSX: typeof XLSXModule =
  typeof (XLSXModule as { readFile?: unknown }).readFile === 'function'
    ? XLSXModule
    : ((XLSXModule as unknown as { default: typeof XLSXModule }).default ?? XLSXModule);

const EXCEL_EPOCH_1970 = 25569; // Excel serial day number of 1970-01-01
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Excel serial day number -> "YYYY-MM-DD", in pure UTC arithmetic (no timezone involved). */
export function excelSerialToIsoDate(serial: number): string {
  return new Date((Math.floor(serial) - EXCEL_EPOCH_1970) * MS_PER_DAY).toISOString().slice(0, 10);
}

/**
 * Reads a sheet as row objects. Date cells come back as "YYYY-MM-DD" strings.
 *
 * Dates are converted from Excel's serial day numbers here rather than with
 * SheetJS's cellDates option: that builds a local-time JS Date, which in some
 * timezones lands seconds before midnight on the previous day (23:59:48 in
 * Asia/Dubai), and the original import stored every date one day early.
 */
export function readSheetAsObjects(
  filePath: string,
  sheetName: string
): Record<string, unknown>[] {
  const workbook = XLSX.readFile(filePath, { cellNF: true });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in ${filePath}`);
  }
  for (const [address, cell] of Object.entries(sheet)) {
    if (address.startsWith('!')) continue;
    const c = cell as XLSXModule.CellObject;
    if (c.t === 'n' && typeof c.z === 'string' && XLSX.SSF.is_date(c.z)) {
      c.t = 's';
      c.v = excelSerialToIsoDate(c.v as number);
    }
  }
  return XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
}

export function mapRow(
  row: Record<string, unknown>,
  columnMap: [string, string][]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [sourceHeader, targetColumn] of columnMap) {
    let value = row[sourceHeader];
    if (typeof value === 'string') {
      value = value.trim();
      if (value === '') value = null;
    }
    out[targetColumn] = value === undefined ? null : value;
  }
  return out;
}
