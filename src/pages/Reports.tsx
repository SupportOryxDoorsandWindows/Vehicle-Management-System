import { useEffect, useMemo, useState } from 'react';
import { fetchVehicles } from '../api/vehicles';
import { fetchAllExpenses } from '../api/expenses';
import { formatAED } from '../lib/format';
import { ExpenseCategoryChart, type CategoryDatum } from '../components/ExpenseCategoryChart';
import type { Vehicle, Expense, SystemCategory } from '../types';

const CATEGORIES: SystemCategory[] = ['fuel', 'insurance', 'repairs', 'maintenance', 'registration', 'finance', 'other'];

export function Reports() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [department, setDepartment] = useState('');

  useEffect(() => {
    fetchVehicles().then(setVehicles);
    fetchAllExpenses().then(setExpenses);
  }, []);

  const departments = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.department).filter(Boolean))) as string[],
    [vehicles]
  );

  const vehicleIdsInDepartment = useMemo(() => {
    if (!department) return null;
    return new Set(vehicles.filter((v) => v.department === department).map((v) => v.id));
  }, [vehicles, department]);

  const filteredExpenses = useMemo(() => {
    if (!vehicleIdsInDepartment) return expenses;
    return expenses.filter((e) => e.vehicle_id && vehicleIdsInDepartment.has(e.vehicle_id));
  }, [expenses, vehicleIdsInDepartment]);

  const totalFleetExpenses = filteredExpenses.reduce((sum, e) => sum + (e.cost ?? 0), 0);
  const unassignedTotal = expenses
    .filter((e) => e.vehicle_id === null)
    .reduce((sum, e) => sum + (e.cost ?? 0), 0);

  const chartData: CategoryDatum[] = CATEGORIES.map((category) => ({
    category,
    amount: filteredExpenses
      .filter((e) => e.system_category === category)
      .reduce((sum, e) => sum + (e.cost ?? 0), 0),
  })).filter((d) => d.amount > 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-oryx-blue mb-4">Reports</h1>
      <label className="text-sm block mb-4">
        Department{' '}
        <select
          aria-label="Department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="border border-oryx-silver rounded px-2 py-1"
        >
          <option value="">All</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="border border-oryx-silver rounded-lg p-4">
          <p className="text-sm text-oryx-silver">Total Fleet Expenses</p>
          <p className="text-2xl font-bold text-oryx-blue">{formatAED(totalFleetExpenses)}</p>
        </div>
        <div className="border border-oryx-silver rounded-lg p-4">
          <p className="text-sm text-oryx-silver">Unassigned Expenses</p>
          <p className="text-2xl font-bold text-oryx-blue">{formatAED(unassignedTotal)}</p>
        </div>
      </div>
      <h2 className="text-lg font-semibold text-oryx-blue mb-2">Expenses by Category</h2>
      <ExpenseCategoryChart data={chartData} />
    </div>
  );
}
