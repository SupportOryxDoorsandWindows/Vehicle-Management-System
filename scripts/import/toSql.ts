export function sqlValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'NULL';
  if (value instanceof Date) {
    // Format from local calendar components, not toISOString(), which
    // converts to UTC first and can shift the date by a day depending on
    // the machine's timezone relative to the source data's assumed
    // timezone (SheetJS returns dates as local-time near-midnight).
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `'${year}-${month}-${day}'`;
  }
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function buildInsertSql(
  table: string,
  columns: string[],
  rows: Record<string, unknown>[]
): string {
  const valueRows = rows.map(
    (row) => `(${columns.map((c) => sqlValue(row[c])).join(', ')})`
  );
  return `insert into ${table} (${columns.join(', ')}) values\n${valueRows.join(',\n')};`;
}
