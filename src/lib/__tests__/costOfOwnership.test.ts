import { describe, it, expect } from 'vitest';
import { calculateCostOfOwnership, type ExpenseLike, type VehicleFinanceInfo } from '../costOfOwnership';

describe('calculateCostOfOwnership', () => {
  const asOf = new Date('2026-09-15T00:00:00.000Z');
  const noFinance: VehicleFinanceInfo = {
    monthlyRepayment: null,
    financeAmount: null,
    startDateOfInstalments: null,
  };

  it('shows Not Available (null), never AED 0, for a category with zero matching expenses', () => {
    const expenses: ExpenseLike[] = [{ systemCategory: 'maintenance', cost: 500 }];
    const result = calculateCostOfOwnership(expenses, noFinance, null, null, asOf);
    expect(result.categories.fuel).toBeNull();
    expect(result.categories.maintenance).toBe(500);
  });

  it('always marks depreciation and taxesAndFees as Not Available (no source data exists for either)', () => {
    const result = calculateCostOfOwnership([], noFinance, null, null, asOf);
    expect(result.categories.depreciation).toBeNull();
    expect(result.categories.taxesAndFees).toBeNull();
    expect(result.excludedCategories).toContain('depreciation');
    expect(result.excludedCategories).toContain('taxesAndFees');
  });

  it('sums only present categories into totalCost, excluding Not Available ones', () => {
    const expenses: ExpenseLike[] = [
      { systemCategory: 'fuel', cost: 100 },
      { systemCategory: 'insurance', cost: 200 },
    ];
    const result = calculateCostOfOwnership(expenses, noFinance, null, null, asOf);
    expect(result.totalCost).toBe(300);
  });

  it('calculates financing as monthly repayment times elapsed months, capped at finance amount', () => {
    const finance: VehicleFinanceInfo = {
      monthlyRepayment: 1000,
      financeAmount: 5000,
      startDateOfInstalments: '2026-01-15',
    };
    const result = calculateCostOfOwnership([], finance, null, null, asOf);
    // asOf is 2026-09-15, start 2026-01-15 -> 8 months elapsed -> 8000, capped at 5000
    expect(result.categories.financing).toBe(5000);
  });

  it('returns null financing when finance fields are missing', () => {
    const result = calculateCostOfOwnership([], noFinance, null, null, asOf);
    expect(result.categories.financing).toBeNull();
  });

  it('computes averageAnnualCost only when registrationDate is present', () => {
    const withoutReg = calculateCostOfOwnership(
      [{ systemCategory: 'fuel', cost: 1200 }],
      noFinance,
      null,
      null,
      asOf
    );
    expect(withoutReg.averageAnnualCost).toBeNull();

    const withReg = calculateCostOfOwnership(
      [{ systemCategory: 'fuel', cost: 1200 }],
      noFinance,
      '2025-09-15',
      null,
      asOf
    );
    // 2025-09-15 to 2026-09-15 (asOf) is exactly ~1 year elapsed (365 days), not 2
    // calendar years — 1200 total / 1 year elapsed = 1200. The old expected value of
    // 600 came from a buggy "calendar-year-boundary-crossings + 1" formula baked into
    // both the original implementation and this fixture; fixed per reviewer finding.
    expect(withReg.averageAnnualCost).toBe(1200);
  });

  it('computes costPerKm only when mileage is present and positive', () => {
    const withoutMileage = calculateCostOfOwnership(
      [{ systemCategory: 'fuel', cost: 1000 }],
      noFinance,
      null,
      null,
      asOf
    );
    expect(withoutMileage.costPerKm).toBeNull();

    const withMileage = calculateCostOfOwnership(
      [{ systemCategory: 'fuel', cost: 1000 }],
      noFinance,
      null,
      100,
      asOf
    );
    expect(withMileage.costPerKm).toBe(10);
  });
});
