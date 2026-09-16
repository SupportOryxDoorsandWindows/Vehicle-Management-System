import * as XLSXModule from 'xlsx';

// The xlsx package's ESM/CJS interop differs between bundled environments (Vite/Vitest)
// and native Node ESM (e.g. running via tsx): under native Node ESM, the named exports
// (readFile, utils, etc.) live on `.default` rather than on the namespace object itself.
// Resolve whichever shape actually has `readFile` so this works in both runtimes.
const XLSX: typeof XLSXModule =
  typeof (XLSXModule as { readFile?: unknown }).readFile === 'function'
    ? XLSXModule
    : ((XLSXModule as unknown as { default: typeof XLSXModule }).default ?? XLSXModule);

export function readSheetAsObjects(
  filePath: string,
  sheetName: string
): Record<string, unknown>[] {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in ${filePath}`);
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
