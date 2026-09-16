import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { YearlyBreakdownTable, type YearlyExpenseLike } from '../YearlyBreakdownTable';
import type { VehicleFinanceInfo } from '../../lib/costOfOwnership';

const asOf = new Date('2026-09-15T00:00:00.000Z');
const noFinance: VehicleFinanceInfo = {
  monthlyRepayment: null,
  financeAmount: null,
  startDateOfInstalments: null,
};

describe('YearlyBreakdownTable', () => {
  it('sums each category into the correct year column across 2+ years of data', () => {
    const expenses: YearlyExpenseLike[] = [
      { date: '2024-03-01', systemCategory: 'fuel', cost: 500 },
      { date: '2024-08-01', systemCategory: 'fuel', cost: 300 },
      { date: '2025-01-10', systemCategory: 'insurance', cost: 1200 },
      { date: '2026-05-01', systemCategory: 'repairs', cost: 400 },
    ];
    render(
      <YearlyBreakdownTable
        expenses={expenses}
        finance={noFinance}
        registrationDate="2024-01-01"
        asOf={asOf}
      />
    );

    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
    expect(screen.getByText('2026')).toBeInTheDocument();

    const fuelRow = screen.getByText('Fuel').closest('tr')!;
    expect(within(fuelRow).getAllByText('AED 800').length).toBeGreaterThan(0);

    const insuranceRow = screen.getByText('Insurance').closest('tr')!;
    expect(within(insuranceRow).getAllByText('AED 1,200').length).toBeGreaterThan(0);

    const repairsRow = screen.getByText('Repairs').closest('tr')!;
    expect(within(repairsRow).getAllByText('AED 400').length).toBeGreaterThan(0);
  });

  it('always shows Not Available for depreciation and taxesAndFees, every year and in the Total column', () => {
    const expenses: YearlyExpenseLike[] = [
      { date: '2024-03-01', systemCategory: 'fuel', cost: 500 },
      { date: '2025-01-10', systemCategory: 'insurance', cost: 1200 },
    ];
    render(
      <YearlyBreakdownTable
        expenses={expenses}
        finance={noFinance}
        registrationDate="2024-01-01"
        asOf={asOf}
      />
    );

    const depreciationRow = screen.getByText('Depreciation').closest('tr')!;
    const depreciationCells = within(depreciationRow).getAllByRole('cell').slice(1);
    depreciationCells.forEach((cell) => expect(cell).toHaveTextContent('Not Available'));

    const taxesRow = screen.getByText('Taxes & Fees').closest('tr')!;
    const taxesCells = within(taxesRow).getAllByRole('cell').slice(1);
    taxesCells.forEach((cell) => expect(cell).toHaveTextContent('Not Available'));
  });

  it('shows Not Available (never AED 0) for a category with no expenses in a given year', () => {
    const expenses: YearlyExpenseLike[] = [{ date: '2024-03-01', systemCategory: 'fuel', cost: 500 }];
    render(
      <YearlyBreakdownTable
        expenses={expenses}
        finance={noFinance}
        registrationDate="2024-01-01"
        asOf={asOf}
      />
    );

    const insuranceRow = screen.getByText('Insurance').closest('tr')!;
    const insuranceCells = within(insuranceRow).getAllByRole('cell').slice(1);
    insuranceCells.forEach((cell) => expect(cell).toHaveTextContent('Not Available'));
    expect(within(insuranceRow).queryByText('AED 0')).not.toBeInTheDocument();
  });

  it('shows Not Available for the whole table when the vehicle has no registration date', () => {
    render(
      <YearlyBreakdownTable expenses={[]} finance={noFinance} registrationDate={null} asOf={asOf} />
    );

    expect(screen.getByText('Yearly Cost Breakdown')).toBeInTheDocument();
    expect(screen.getByText(/Not Available/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
