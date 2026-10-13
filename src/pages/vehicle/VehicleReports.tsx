import { useOutletContext } from 'react-router-dom';
import { fetchExpensesByVehicle } from '../../api/expenses';
import { calculateCostOfOwnership } from '../../lib/costOfOwnership';
import { useLoad } from '../../lib/useLoad';
import { LoadError } from '../../components/LoadError';
import { PrintButton } from '../../components/ExportButtons';
import { CostOfOwnershipSummary } from '../../components/CostOfOwnershipSummary';
import { ExpenseCategoryChart, type CategoryDatum } from '../../components/ExpenseCategoryChart';
import { YearlyBreakdownTable } from '../../components/YearlyBreakdownTable';
import type { Vehicle } from '../../types';

export function VehicleReports() {
  const vehicle = useOutletContext<Vehicle>();
  const { data, error } = useLoad(async () => {
    const expenses = await fetchExpensesByVehicle(vehicle.id);
    const asOf = new Date();
    const result = calculateCostOfOwnership(
      expenses.map((e) => ({ systemCategory: e.system_category, cost: e.cost })),
      {
        monthlyRepayment: vehicle.monthly_repayment,
        financeAmount: vehicle.finance_amount,
        startDateOfInstalments: vehicle.start_date_of_instalments,
      },
      vehicle.registration_date,
      vehicle.last_service_mileage_km,
      asOf
    );
    const chartData: CategoryDatum[] = Object.entries(result.categories)
      .filter(([, value]) => value !== null)
      .map(([category, amount]) => ({ category, amount: amount as number }));
    return { expenses, asOf, result, chartData };
  }, [vehicle]);

  if (error) return <LoadError what="this vehicle's report" message={error} />;
  if (!data) return <p>Loading...</p>;
  const { expenses, asOf, result, chartData } = data;

  return (
    <div>
      <div className="flex justify-end mb-2">
        <PrintButton />
      </div>
      <CostOfOwnershipSummary result={result} />
      <h2 className="text-lg font-semibold text-oryx-blue mt-8 mb-2">Expenses by Category</h2>
      <ExpenseCategoryChart data={chartData} />
      <YearlyBreakdownTable
        expenses={expenses.map((e) => ({
          date: e.date,
          systemCategory: e.system_category,
          cost: e.cost,
        }))}
        finance={{
          monthlyRepayment: vehicle.monthly_repayment,
          financeAmount: vehicle.finance_amount,
          startDateOfInstalments: vehicle.start_date_of_instalments,
        }}
        registrationDate={vehicle.registration_date}
        asOf={asOf}
      />
    </div>
  );
}
