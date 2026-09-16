import type { SystemCategory } from '../types';

export const SUMMABLE_CATEGORIES = ['fuel', 'insurance', 'repairs', 'maintenance', 'registration', 'other'] as const;
export type SummableCategory = (typeof SUMMABLE_CATEGORIES)[number];

export interface ExpenseLike {
  systemCategory: SystemCategory;
  cost: number | null;
}

export interface VehicleFinanceInfo {
  monthlyRepayment: number | null;
  financeAmount: number | null;
  startDateOfInstalments: string | null;
}

export interface CostOfOwnership {
  categories: Record<SummableCategory | 'financing' | 'depreciation' | 'taxesAndFees', number | null>;
  totalCost: number;
  excludedCategories: string[];
  averageAnnualCost: number | null;
  averageMonthlyCost: number | null;
  costPerKm: number | null;
}

function sumByCategory(expenses: ExpenseLike[]): Record<SummableCategory, number | null> {
  const totals = {} as Record<SummableCategory, number | null>;
  for (const category of SUMMABLE_CATEGORIES) {
    const matches = expenses.filter((e) => e.systemCategory === category);
    totals[category] =
      matches.length === 0 ? null : matches.reduce((sum, e) => sum + (e.cost ?? 0), 0);
  }
  return totals;
}

export function calculateFinancingCost(finance: VehicleFinanceInfo, asOf: Date): number | null {
  if (
    finance.monthlyRepayment == null ||
    finance.financeAmount == null ||
    !finance.startDateOfInstalments
  ) {
    return null;
  }
  const start = new Date(finance.startDateOfInstalments);
  const monthsElapsed = Math.max(
    0,
    (asOf.getFullYear() - start.getFullYear()) * 12 + (asOf.getMonth() - start.getMonth())
  );
  return Math.min(finance.monthlyRepayment * monthsElapsed, finance.financeAmount);
}

export function calculateCostOfOwnership(
  expenses: ExpenseLike[],
  finance: VehicleFinanceInfo,
  registrationDate: string | null,
  lastServiceMileageKm: number | null,
  asOf: Date
): CostOfOwnership {
  const categories = {
    ...sumByCategory(expenses),
    financing: calculateFinancingCost(finance, asOf),
    depreciation: null,
    taxesAndFees: null,
  };

  const excludedCategories = Object.entries(categories)
    .filter(([, value]) => value === null)
    .map(([key]) => key);

  const totalCost = Object.values(categories).reduce(
    (sum: number, value) => sum + (value ?? 0),
    0
  );

  let averageAnnualCost: number | null = null;
  let averageMonthlyCost: number | null = null;
  if (registrationDate) {
    const start = new Date(registrationDate);
    const msPerDay = 1000 * 60 * 60 * 24;
    const elapsedDays = (asOf.getTime() - start.getTime()) / msPerDay;
    const elapsedYears = elapsedDays / 365.25;
    // Floor at 1 year so a recently-registered vehicle's cost isn't divided by
    // a fraction below 1 (which would inflate, not deflate, the average).
    const years = Math.max(1, elapsedYears);
    averageAnnualCost = totalCost / years;
    averageMonthlyCost = totalCost / (years * 12);
  }

  const costPerKm =
    lastServiceMileageKm && lastServiceMileageKm > 0 ? totalCost / lastServiceMileageKm : null;

  return { categories, totalCost, excludedCategories, averageAnnualCost, averageMonthlyCost, costPerKm };
}
