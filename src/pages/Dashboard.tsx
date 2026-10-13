import { fetchVehicles } from '../api/vehicles';
import { fetchAllExpenses, fetchUnassignedExpenses } from '../api/expenses';
import { getDocumentStatus } from '../lib/documentStatus';
import { formatAED } from '../lib/format';
import { SummaryTile } from '../components/SummaryTile';
import { LoadError } from '../components/LoadError';
import { useLoad } from '../lib/useLoad';
import { useSettings } from '../lib/useSettings';
import { VehicleCard } from '../components/VehicleCard';
import type { Expense } from '../types';

export function Dashboard() {
  const { data, error } = useLoad(
    () => Promise.all([fetchVehicles(), fetchAllExpenses(), fetchUnassignedExpenses()]),
    []
  );
  const { expiringSoonDays } = useSettings();

  if (error) return <LoadError what="the dashboard" message={error} />;
  if (!data) return <p>Loading...</p>;
  const [vehicles, expenses, unassigned] = data;

  const totalsByVehicle = new Map<string, number>();
  for (const e of expenses) {
    if (!e.vehicle_id || e.cost == null) continue;
    totalsByVehicle.set(e.vehicle_id, (totalsByVehicle.get(e.vehicle_id) ?? 0) + e.cost);
  }

  const thisYear = new Date().getFullYear();
  const sumBy = (predicate: (e: Expense) => boolean) =>
    expenses.filter(predicate).reduce((sum, e) => sum + (e.cost ?? 0), 0);

  const totalFleetExpenses = sumBy(() => true);
  const thisYearExpenses = sumBy((e) => !!e.date && new Date(e.date).getFullYear() === thisYear);
  const maintenanceCost = sumBy((e) => e.system_category === 'maintenance');
  const repairCost = sumBy((e) => e.system_category === 'repairs');
  const fuelCost = sumBy((e) => e.system_category === 'fuel');

  const asOf = new Date();
  const expiredDocuments = vehicles.filter(
    (v) => getDocumentStatus(v.vehicle_license_expiry_date, asOf, expiringSoonDays) === 'expired'
  ).length;
  const upcomingRenewals = vehicles.filter(
    (v) => getDocumentStatus(v.vehicle_license_expiry_date, asOf, expiringSoonDays) === 'expiring_soon'
  ).length;

  const top5 = [...vehicles]
    .map((v) => ({ vehicle: v, total: totalsByVehicle.get(v.id) ?? 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-bold text-oryx-blue mb-4">Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <SummaryTile label="Total Vehicles" value={vehicles.length} />
        <SummaryTile label="Active Vehicles" value={vehicles.filter((v) => v.status === 'active').length} />
        <SummaryTile label="Inactive Vehicles" value={vehicles.filter((v) => v.status === 'inactive').length} />
        <SummaryTile label="Total Fleet Expenses" value={formatAED(totalFleetExpenses)} />
        <SummaryTile label="This Year's Expenses" value={formatAED(thisYearExpenses)} />
        <SummaryTile label="Maintenance Cost" value={formatAED(maintenanceCost)} />
        <SummaryTile label="Repair Cost" value={formatAED(repairCost)} />
        <SummaryTile label="Fuel Cost" value={formatAED(fuelCost)} />
        <SummaryTile label="Upcoming Renewals" value={upcomingRenewals} />
        <SummaryTile label="Expired Documents" value={expiredDocuments} />
        <SummaryTile label="Unassigned Expenses" value={unassigned.length} />
      </div>
      <h2 className="text-lg font-semibold text-oryx-blue mb-2">Top 5 Vehicles by Expense</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {top5.map(({ vehicle, total }) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} totalExpenses={total} />
        ))}
      </div>
    </div>
  );
}
