import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchExpensesByVehicle } from '../../api/expenses';
import { formatAED } from '../../lib/format';
import type { Vehicle, Expense } from '../../types';

export function Maintenance() {
  const vehicle = useOutletContext<Vehicle>();
  const [records, setRecords] = useState<Expense[]>([]);

  useEffect(() => {
    fetchExpensesByVehicle(vehicle.id).then((expenses) =>
      setRecords(
        expenses.filter((e) => e.system_category === 'maintenance' || e.system_category === 'repairs')
      )
    );
  }, [vehicle.id]);

  return (
    <div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-oryx-silver">
            <th className="py-2">Date</th>
            <th>Service Type</th>
            <th>Mileage</th>
            <th>Cost</th>
            <th>Supplier</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b border-oryx-silver">
              <td className="py-2">{r.date ?? 'Not Available'}</td>
              <td>{r.expense ?? 'Not Available'}</td>
              <td>
                {vehicle.last_service_mileage_km != null
                  ? `${vehicle.last_service_mileage_km.toLocaleString('en-AE')} KM`
                  : 'Not Available'}
              </td>
              <td>{formatAED(r.cost)}</td>
              <td>{r.supplier_name ?? 'Not Available'}</td>
              <td>{r.expense_description ?? 'Not Available'}</td>
            </tr>
          ))}
          {records.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-oryx-silver">
                No maintenance or repair records for this vehicle.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="mt-4 text-sm text-oryx-silver">
        Next Service Date / Next Service Mileage: Not Available (no source data for scheduled
        servicing exists yet).
      </p>
    </div>
  );
}
