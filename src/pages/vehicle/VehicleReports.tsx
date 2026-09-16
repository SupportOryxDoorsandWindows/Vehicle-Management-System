import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchExpensesByVehicle } from '../../api/expenses';
import { calculateCostOfOwnership, type CostOfOwnership } from '../../lib/costOfOwnership';
import { CostOfOwnershipSummary } from '../../components/CostOfOwnershipSummary';
import { ExpenseCategoryChart, type CategoryDatum } from '../../components/ExpenseCategoryChart';
import { YearlyBreakdownTable } from '../../components/YearlyBreakdownTable';
import type { Vehicle, Expense } from '../../types';

export function VehicleReports() {
  const vehicle = useOutletContext<Vehicle>();
  const [result, setResult] = useState<CostOfOwnership | null>(null);
  const [chartData, setChartData] = useState<CategoryDatum[]>([]);
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [asOf, setAsOf] = useState<Date | null>(null);

  useEffect(() => {
    fetchExpensesByVehicle(vehicle.id).then((fetchedExpenses: Expense[]) => {
      const asOf = new Date();
      const calculated = calculateCostOfOwnership(
        fetchedExpenses.map((e) => ({ systemCategory: e.system_category, cost: e.cost })),
        {
          monthlyRepayment: vehicle.monthly_repayment,
          financeAmount: vehicle.finance_amount,
          startDateOfInstalments: vehicle.start_date_of_instalments,
        },
        vehicle.registration_date,
        vehicle.last_service_mileage_km,
        asOf
      );
      setResult(calculated);
      setExpenses(fetchedExpenses);
      setAsOf(asOf);
      setChartData(
        Object.entries(calculated.categories)
          .filter(([, value]) => value !== null)
          .map(([category, amount]) => ({ category, amount: amount as number }))
      );
    });
  }, [vehicle]);

  if (!result || !expenses || !asOf) return <p>Loading...</p>;

  return (
    <div>
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
