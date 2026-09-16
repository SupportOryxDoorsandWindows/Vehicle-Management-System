export function sqlValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'NULL';
  if (value instanceof Date) return `'${value.toISOString().slice(0, 10)}'`;
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
