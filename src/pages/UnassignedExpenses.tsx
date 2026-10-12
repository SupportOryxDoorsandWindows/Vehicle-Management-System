import { useState } from 'react';
import { Link } from 'react-router-dom';
import { assignExpenseToVehicle, fetchUnassignedExpenses } from '../api/expenses';
import { fetchVehicles } from '../api/vehicles';
import { formatAED } from '../lib/format';
import { LoadError } from '../components/LoadError';
import { errorMessage, useLoad } from '../lib/useLoad';
import { useIsAdmin } from '../lib/useIsAdmin';
import { vehicleOptionLabel } from '../lib/expenseFields';
import type { Expense, Vehicle } from '../types';

export function UnassignedExpenses() {
  const isAdmin = useIsAdmin();
  const [reloadCount, setReloadCount] = useState(0);
  const { data, error } = useLoad(
    () => Promise.all([fetchUnassignedExpenses(), isAdmin ? fetchVehicles() : Promise.resolve([])]),
    [reloadCount, isAdmin]
  );
  const [assignError, setAssignError] = useState<string | null>(null);

  async function assign(expenseId: string, vehicleId: string) {
    setAssignError(null);
    try {
      await assignExpenseToVehicle(expenseId, vehicleId);
    } catch (err) {
      setAssignError(errorMessage(err));
    }
    setReloadCount((n) => n + 1);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-oryx-blue">Unassigned Expenses</h1>
        {isAdmin && (
          <Link to="/expenses/new" className="bg-oryx-blue text-white rounded px-3 py-1 text-sm">
            Add expense
          </Link>
        )}
      </div>
      <p className="text-sm text-oryx-silver mb-4">
        These expense records have no vehicle number, or a vehicle number that didn't match a
        known plate.{isAdmin && ' Assign each one to its vehicle so it counts toward that vehicle\'s costs.'}
      </p>
      {assignError && (
        <p role="alert" className="text-red-700 text-sm mb-4">
          {assignError}
        </p>
      )}
      {error ? (
        <LoadError what="unassigned expenses" message={error} />
      ) : !data ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-oryx-silver">
              <th className="py-2">Date</th>
              <th>Expense</th>
              <th>Supplier</th>
              <th>Amount</th>
              <th>Vehicle</th>
              {isAdmin && <th aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {data[0].map((e) => (
              <tr key={e.id} className="border-b border-oryx-silver">
                <td className="py-2">{e.date ?? 'Not Available'}</td>
                <td>{e.expense ?? 'Not Available'}</td>
                <td>{e.supplier_name ?? 'Not Available'}</td>
                <td>{formatAED(e.cost)}</td>
                <td>
                  {isAdmin ? (
                    <AssignControl expense={e} vehicles={data[1]} onAssign={assign} />
                  ) : (
                    'Vehicle Not Assigned'
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
            {data[0].length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="py-4 text-oryx-silver">
                  Every expense is assigned to a vehicle.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AssignControl({
  expense,
  vehicles,
  onAssign,
}: {
  expense: Expense;
  vehicles: Vehicle[];
  onAssign: (expenseId: string, vehicleId: string) => Promise<void>;
}) {
  const [vehicleId, setVehicleId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const description = expense.expense ?? 'this expense';

  return (
    <div className="flex gap-2 items-center py-1">
      <select
        aria-label={`Vehicle for ${description}`}
        value={vehicleId}
        onChange={(e) => setVehicleId(e.target.value)}
        className="border border-oryx-silver rounded px-2 py-1"
      >
        <option value="">Choose vehicle…</option>
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>
            {vehicleOptionLabel(v)}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!vehicleId || assigning}
        onClick={async () => {
          setAssigning(true);
          await onAssign(expense.id, vehicleId);
          setAssigning(false);
        }}
        className="bg-oryx-blue text-white rounded px-3 py-1 disabled:opacity-50"
      >
        Assign
      </button>
    </div>
  );
}
