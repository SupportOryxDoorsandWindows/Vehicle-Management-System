import * as XLSX from 'xlsx';

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
