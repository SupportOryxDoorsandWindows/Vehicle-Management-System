import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchVehicles } from '../api/vehicles';
import { fetchAllExpenses } from '../api/expenses';
import { VehicleCard } from '../components/VehicleCard';
import { formatAED } from '../lib/format';
import type { Vehicle, Expense } from '../types';

export function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [view, setView] = useState<'cards' | 'table'>('cards');

  useEffect(() => {
    fetchVehicles().then(setVehicles);
    fetchAllExpenses().then(setExpenses);
  }, []);

  const totalsByVehicle = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenses) {
      if (!e.vehicle_id || e.cost == null) continue;
      totals.set(e.vehicle_id, (totals.get(e.vehicle_id) ?? 0) + e.cost);
    }
    return totals;
  }, [expenses]);

  const departments = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.department).filter(Boolean))) as string[],
    [vehicles]
  );

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return vehicles.filter((v) => {
      if (department && v.department !== department) return false;
      if (status && v.status !== status) return false;
      if (!query) return true;
      return [v.plate_no, v.model, v.driver, v.department]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query));
    });
  }, [vehicles, search, department, status]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-oryx-blue">Vehicles</h1>
        <button
          type="button"
          onClick={() => setView(view === 'cards' ? 'table' : 'cards')}
          className="border border-oryx-silver rounded px-3 py-1 text-sm"
        >
          {view === 'cards' ? 'Table View' : 'Card View'}
        </button>
      </div>
      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="text"
          placeholder="Search by plate, model, driver, or department"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-oryx-silver rounded px-3 py-2 flex-1 min-w-[240px]"
        />
        <label className="text-sm">
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
        <label className="text-sm">
          Status{' '}
          <select
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-oryx-silver rounded px-2 py-1"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>
      {view === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <VehicleCard key={v.id} vehicle={v} totalExpenses={totalsByVehicle.get(v.id) ?? 0} />
          ))}
        </div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-oryx-silver">
              <th className="py-2">Plate</th>
              <th>Make</th>
              <th>Model</th>
              <th>Driver</th>
              <th>Department</th>
              <th>Condition</th>
              <th>Status</th>
              <th>Total Expenses</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v.id} className="border-b border-oryx-silver">
                <td className="py-2">
                  <Link to={`/vehicles/${v.id}`} className="text-oryx-blue underline">
                    {v.plate_no}
                  </Link>
                </td>
                <td>{v.brand ?? 'Not Available'}</td>
                <td>{v.model ?? 'Not Available'}</td>
                <td>{v.driver ?? 'Not Assigned'}</td>
                <td>{v.department ?? 'Not Assigned'}</td>
                <td>{v.vehicle_condition ?? 'Not Available'}</td>
                <td className="capitalize">{v.status}</td>
                <td>{formatAED(totalsByVehicle.get(v.id) ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
