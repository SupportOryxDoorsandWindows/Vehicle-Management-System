import { describe, it, expect } from 'vitest';
import { buildInsertSql, sqlValue } from '../toSql';

describe('sqlValue', () => {
  it('quotes strings and escapes single quotes', () => {
    expect(sqlValue("O'Brien")).toBe("'O''Brien'");
  });
  it('renders null/undefined/empty string as NULL', () => {
    expect(sqlValue(null)).toBe('NULL');
    expect(sqlValue(undefined)).toBe('NULL');
    expect(sqlValue('')).toBe('NULL');
  });
  it('renders numbers unquoted', () => {
    expect(sqlValue(1250)).toBe('1250');
  });
  it('renders dates as YYYY-MM-DD using local calendar components, not UTC', () => {
    // Construct via the local-time Date constructor (not an ISO string) so this
    // test verifies local-component formatting without being timezone-flaky
    // itself: new Date(y, m, d) always means midnight local time, wherever the
    // test runs, and should always format back to the same y-m-d.
    expect(sqlValue(new Date(2026, 8, 15))).toBe("'2026-09-15'");
    // Near-midnight local time (e.g. 23:59:48, as SheetJS returns) must not
    // roll over to the next day when converted through toISOString()/UTC.
    expect(sqlValue(new Date(2026, 9, 16, 23, 59, 48))).toBe("'2026-10-16'");
  });
});

describe('buildInsertSql', () => {
  it('builds a multi-row insert statement in column order', () => {
    const sql = buildInsertSql('public.vehicles', ['id', 'plate_no', 'brand'], [
      { id: '1', plate_no: 'U 67931', brand: 'Ford' },
      { id: '2', plate_no: "O'Reilly Plate", brand: null },
    ]);
    expect(sql).toBe(
      "insert into public.vehicles (id, plate_no, brand) values\n" +
        "('1', 'U 67931', 'Ford'),\n" +
        "('2', 'O''Reilly Plate', NULL);"
    );
  });
});
