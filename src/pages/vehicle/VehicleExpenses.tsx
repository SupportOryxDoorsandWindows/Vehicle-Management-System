import { useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { fetchExpensesByVehicle } from '../../api/expenses';
import { fetchExpenseDocuments } from '../../api/documents';
import { FileLink } from '../../components/DocumentSlot';
import { ExportButton } from '../../components/ExportButtons';
import { exportFileName } from '../../lib/exportExcel';
import { expensesSheet } from '../../lib/exportSheets';
import { formatAED } from '../../lib/format';
import { LoadError } from '../../components/LoadError';
import { useLoad } from '../../lib/useLoad';
import { useIsAdmin } from '../../lib/useIsAdmin';
import type { Vehicle, Expense, DocumentWithUrl } from '../../types';

const NO_EXPENSES: Expense[] = [];

export function VehicleExpenses() {
  const vehicle = useOutletContext<Vehicle>();
  const { data, error } = useLoad(async () => {
    const expenses = await fetchExpensesByVehicle(vehicle.id);
    // Attachments are secondary: if they fail to load, still show the expenses.
    const documents = await fetchExpenseDocuments(expenses.map((e) => e.id)).catch(() => null);
    return { expenses, documents };
  }, [vehicle.id]);
  const expenses = data?.expenses ?? NO_EXPENSES;
  const [typeFilter, setTypeFilter] = useState('');
  const isAdmin = useIsAdmin();

  const types = useMemo(
    () => Array.from(new Set(expenses.map((e) => e.type_of_expense).filter(Boolean))) as string[],
    [expenses]
  );

  const filtered = useMemo(
    () => (typeFilter ? expenses.filter((e) => e.type_of_expense === typeFilter) : expenses),
    [expenses, typeFilter]
  );

  if (error) return <LoadError what="expenses" message={error} />;
  if (!data) return <p>Loading...</p>;

  const total = filtered.reduce((sum, e) => sum + (e.cost ?? 0), 0);
  const filesByExpense = new Map<string, DocumentWithUrl[]>();
  for (const d of data.documents ?? []) {
    if (!d.expense_id) continue;
    filesByExpense.set(d.expense_id, [...(filesByExpense.get(d.expense_id) ?? []), d]);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <label className="text-sm">
          Filter by Type{' '}
          <select
            aria-label="Filter by Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-oryx-silver rounded px-2 py-1"
          >
            <option value="">All</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-4 items-center">
          <ExportButton
            fileName={exportFileName(`${vehicle.plate_no} expenses`)}
            sheets={() => [expensesSheet('Expenses', filtered)]}
          />
          <p className="font-semibold text-oryx-blue">
            Total Expenses: <span>{formatAED(total)}</span>
          </p>
          {isAdmin && (
            <Link
              to={`/expenses/new?vehicle=${vehicle.id}`}
              className="bg-oryx-blue text-white rounded px-3 py-1 text-sm"
            >
              Add expense
            </Link>
          )}
        </div>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-oryx-silver">
            <th className="py-2">Date</th>
            <th>Expense Type</th>
            <th>Description</th>
            <th>Supplier</th>
            <th>Amount</th>
            <th>Files</th>
            {isAdmin && <th aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {filtered.map((e) => (
            <tr key={e.id} className="border-b border-oryx-silver">
              <td className="py-2">{e.date ?? 'Not Available'}</td>
              <td>{e.expense ?? 'Not Available'}</td>
              <td>{e.expense_description ?? 'Not Available'}</td>
              <td>{e.supplier_name ?? 'Not Available'}</td>
              <td>{formatAED(e.cost)}</td>
              <td>
                {data.documents === null ? (
                  <span className="text-oryx-silver">Unavailable</span>
                ) : (
                  <ul>
                    {(filesByExpense.get(e.id) ?? []).map((d) => (
                      <li key={d.id}>
                        <FileLink document={d} />
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              {isAdmin && (
                <td>
                  <Link to={`/expenses/${e.id}/edit`} className="text-oryx-blue underline">
                    Edit
                  </Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
