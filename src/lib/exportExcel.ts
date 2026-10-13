import type { Cell, Sheet } from 'write-excel-file/browser';

export type ExportValue = string | number | null | undefined;
export type ColumnKind = 'text' | 'number' | 'money' | 'date';

export interface ExportColumn<T> {
  header: string;
  kind?: ColumnKind;
  /** Width in characters. */
  width?: number;
  value: (item: T) => ExportValue;
}

export interface ExportSheet {
  name: string;
  columns: { header: string; kind: ColumnKind; width?: number }[];
  rows: ExportValue[][];
}

export function buildSheet<T>(name: string, columns: ExportColumn<T>[], items: T[]): ExportSheet {
  return {
    name,
    columns: columns.map(({ header, kind = 'text', width }) => ({ header, kind, width })),
    rows: items.map((item) => columns.map((c) => c.value(item))),
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toCell(value: ExportValue, kind: ColumnKind): Cell {
  if (value === null || value === undefined || value === '') return null;
  if (kind === 'date' && typeof value === 'string' && ISO_DATE.test(value)) {
    // "YYYY-MM-DD" parses as UTC midnight, which is how the library writes dates.
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return { value: date, type: Date, format: 'dd/mm/yyyy' };
  }
  if ((kind === 'money' || kind === 'number') && typeof value === 'number') {
    return kind === 'money' ? { value, type: Number, format: '#,##0.00' } : { value, type: Number };
  }
  return { value: String(value), type: String };
}

const DEFAULT_WIDTHS: Record<ColumnKind, number> = { text: 20, number: 12, money: 14, date: 12 };

/** Our sheets in the shape write-excel-file expects: bold, frozen header row; typed cells. */
export function toWorkbookSheets(sheets: ExportSheet[]): Sheet<Blob>[] {
  return sheets.map((s) => ({
    // Excel limits sheet names to 31 characters.
    sheet: s.name.slice(0, 31),
    stickyRowsCount: 1,
    columns: s.columns.map((c) => ({ width: c.width ?? DEFAULT_WIDTHS[c.kind] })),
    data: [
      s.columns.map((c) => ({ value: c.header, fontWeight: 'bold' as const })),
      ...s.rows.map((row) => row.map((value, i) => toCell(value, s.columns[i].kind))),
    ],
  }));
}

/** e.g. exportFileName('U 67931 expenses') -> "u-67931-expenses-2026-10-13.xlsx" (local date). */
export function exportFileName(base: string, now = new Date()): string {
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `${slug || 'export'}-${date}.xlsx`;
}

export async function downloadWorkbook(fileName: string, sheets: ExportSheet[]): Promise<void> {
  // Loaded on demand so the Excel writer isn't part of the initial page load.
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  await writeXlsxFile(toWorkbookSheets(sheets)).toFile(fileName);
}
