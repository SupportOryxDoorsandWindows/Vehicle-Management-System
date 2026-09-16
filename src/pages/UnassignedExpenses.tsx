import { useEffect, useState } from 'react';
import { fetchUnassignedExpenses } from '../api/expenses';
import { formatAED } from '../lib/format';
import type { Expense } from '../types';

export function UnassignedExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    fetchUnassignedExpenses().then(setExpenses);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-oryx-blue mb-4">Unassigned Expenses</h1>
      <p className="text-sm text-oryx-silver mb-4">
        These expense records have no vehicle number, or a vehicle number that didn't match a
        known plate. Assigning them to a vehicle is a Phase 2 feature.
      </p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-oryx-silver">
            <th className="py-2">Date</th>
            <th>Expense</th>
            <th>Supplier</th>
            <th>Amount</th>
            <th>Vehicle</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => (
            <tr key={e.id} className="border-b border-oryx-silver">
              <td className="py-2">{e.date ?? 'Not Available'}</td>
              <td>{e.expense ?? 'Not Available'}</td>
              <td>{e.supplier_name ?? 'Not Available'}</td>
              <td>{formatAED(e.cost)}</td>
              <td>Vehicle Not Assigned</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
