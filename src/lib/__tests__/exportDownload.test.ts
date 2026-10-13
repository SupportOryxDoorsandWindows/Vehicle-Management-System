import { describe, it, expect, vi } from 'vitest';
import writeXlsxFile from 'write-excel-file/browser';
import { buildSheet, downloadWorkbook, toWorkbookSheets } from '../exportExcel';

const toFile = vi.fn().mockResolvedValue(undefined);
vi.mock('write-excel-file/browser', () => ({ default: vi.fn(() => ({ toFile, toBlob: vi.fn() })) }));

describe('downloadWorkbook', () => {
  it('hands the sheets to the Excel writer and saves under the given name', async () => {
    const sheets = [buildSheet('Vehicles', [{ header: 'Plate', value: (p: string) => p }], ['U 67931'])];

    await downloadWorkbook('vehicles-2026-10-13.xlsx', sheets);

    expect(writeXlsxFile).toHaveBeenCalledWith(toWorkbookSheets(sheets));
    expect(toFile).toHaveBeenCalledWith('vehicles-2026-10-13.xlsx');
  });
});
