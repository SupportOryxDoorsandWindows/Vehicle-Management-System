import { formatAED } from '../lib/format';
import {
  calculateFinancingCost,
  SUMMABLE_CATEGORIES,
  type SummableCategory,
  type VehicleFinanceInfo,
} from '../lib/costOfOwnership';
import type { SystemCategory } from '../types';

const LABELS: Record<string, string> = {
  fuel: 'Fuel',
  insurance: 'Insurance',
  repairs: 'Repairs',
  maintenance: 'Maintenance',
  registration: 'Registration',
  other: 'Other Costs',
  financing: 'Financing',
  depreciation: 'Depreciation',
  taxesAndFees: 'Taxes & Fees',
};

const ROW_ORDER = [...SUMMABLE_CATEGORIES, 'financing', 'depreciation', 'taxesAndFees'] as const;

export interface YearlyExpenseLike {
  date: string | null;
  systemCategory: SystemCategory;
  cost: number | null;
}

interface Row {
  key: (typeof ROW_ORDER)[number];
  values: (number | null)[];
  total: number | null;
}

function yearRange(registrationDate: string | null, asOf: Date): number[] | null {
  if (!registrationDate) return null;
  const start = new Date(registrationDate);
  if (Number.isNaN(start.getTime())) return null;
  const startYear = start.getFullYear();
  const endYear = asOf.getFullYear();
  if (startYear > endYear) return [endYear];
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);
  return years;
}

function sumForYear(
  expenses: YearlyExpenseLike[],
  year: number,
  category: SummableCategory
): number | null {
  const matches = expenses.filter((e) => {
    if (!e.date || e.systemCategory !== category) return false;
    const d = new Date(e.date);
    return !Number.isNaN(d.getTime()) && d.getFullYear() === year;
  });
  return matches.length === 0 ? null : matches.reduce((sum, e) => sum + (e.cost ?? 0), 0);
}

// Cumulative financing cost accrued from the start of instalments through the
// end of `year` (or through `asOf` if `year` is still in progress). Sliced
// per-year by taking the difference between consecutive year-end cumulative
// totals, using the same formula as calculateCostOfOwnership's overall
// financing figure (Task 7) so the two stay consistent.
function financingThroughYearEnd(finance: VehicleFinanceInfo, year: number, asOf: Date): number | null {
  const yearEnd = year >= asOf.getFullYear() ? asOf : new Date(year, 11, 31);
  return calculateFinancingCost(finance, yearEnd);
}

function rowTotal(values: (number | null)[]): number | null {
  if (values.every((v) => v === null)) return null;
  return values.reduce((sum: number, v) => sum + (v ?? 0), 0);
}

export function YearlyBreakdownTable({
  expenses,
  finance,
  registrationDate,
  asOf,
}: {
  expenses: YearlyExpenseLike[];
  finance: VehicleFinanceInfo;
  registrationDate: string | null;
  asOf: Date;
}) {
  const years = yearRange(registrationDate, asOf);

  if (!years) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-oryx-blue mt-8 mb-2">Yearly Cost Breakdown</h2>
        <p className="text-sm text-oryx-silver">
          Not Available &mdash; this vehicle has no registration date on file, so a year range cannot
          be determined.
        </p>
      </div>
    );
  }

  const rows: Row[] = ROW_ORDER.map((key) => {
    let values: (number | null)[];
    if (key === 'depreciation' || key === 'taxesAndFees') {
      values = years.map(() => null);
    } else if (key === 'financing') {
      values = years.map((year, index) => {
        const throughThisYear = financingThroughYearEnd(finance, year, asOf);
        const throughPriorYear = financingThroughYearEnd(finance, years[index] - 1, asOf);
        if (throughThisYear === null || throughPriorYear === null) return null;
        return throughThisYear - throughPriorYear;
      });
    } else {
      values = years.map((year) => sumForYear(expenses, year, key));
    }
    return { key, values, total: rowTotal(values) };
  });

  const totalCostValues = years.map((_, yearIndex) =>
    rowTotal(rows.map((row) => row.values[yearIndex]))
  );
  const totalCostTotal = rowTotal(totalCostValues);

  return (
    <div>
      <h2 className="text-lg font-semibold text-oryx-blue mt-8 mb-2">Yearly Cost Breakdown</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-oryx-silver font-normal pr-4 py-1">Category</th>
              {years.map((year) => (
                <th key={year} className="text-right text-oryx-silver font-normal px-4 py-1">
                  {year}
                </th>
              ))}
              <th className="text-right text-oryx-silver font-normal pl-4 py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="text-black pr-4 py-1">{LABELS[row.key] ?? row.key}</td>
                {row.values.map((value, i) => (
                  <td key={years[i]} className="text-right text-black px-4 py-1">
                    {formatAED(value)}
                  </td>
                ))}
                <td className="text-right text-black pl-4 py-1">{formatAED(row.total)}</td>
              </tr>
            ))}
            <tr>
              <td className="text-oryx-blue font-semibold pr-4 py-1">Total Cost</td>
              {totalCostValues.map((value, i) => (
                <td key={years[i]} className="text-right text-oryx-blue font-semibold px-4 py-1">
                  {formatAED(value)}
                </td>
              ))}
              <td className="text-right text-oryx-blue font-semibold pl-4 py-1">
                {formatAED(totalCostTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
