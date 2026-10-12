import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchExpensesByVehicle } from '../../api/expenses';
import { formatAED } from '../../lib/format';
import { LoadError } from '../../components/LoadError';
import { useLoad } from '../../lib/useLoad';
import type { Vehicle, Expense } from '../../types';

const NO_EXPENSES: Expense[] = [];

export function VehicleExpenses() {
  const vehicle = useOutletContext<Vehicle>();
  const { data, error } = useLoad(() => fetchExpensesByVehicle(vehicle.id), [vehicle.id]);
  const expenses = data ?? NO_EXPENSES;
  const [typeFilter, setTypeFilter] = useState('');

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
        <p className="font-semibold text-oryx-blue">
          Total Expenses: <span>{formatAED(total)}</span>
        </p>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-oryx-silver">
            <th className="py-2">Date</th>
            <th>Expense Type</th>
            <th>Description</th>
            <th>Supplier</th>
            <th>Amount</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
