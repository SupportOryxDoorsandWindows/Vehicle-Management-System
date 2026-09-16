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

  it('slices real financing data per year: AED 0 before the loan starts, a real figure once it is active', () => {
    // Vehicle registered 2024-01-01; loan starts mid-2025; asOf is Sept 2026.
    // monthsElapsed at each year-end (floored at 0): 2024 -> 0, 2025 -> 6, 2026 (through asOf) -> 15.
    // Per-year deltas: 2024 = 0, 2025 = 6*1000 - 0 = 6000, 2026 = 15*1000 - 6000 = 9000.
    const finance: VehicleFinanceInfo = {
      monthlyRepayment: 1000,
      financeAmount: 20000,
      startDateOfInstalments: '2025-06-15',
    };
    const expenses: YearlyExpenseLike[] = [
      { date: '2024-03-01', systemCategory: 'fuel', cost: 500 },
      { date: '2025-01-10', systemCategory: 'insurance', cost: 1200 },
      { date: '2026-05-01', systemCategory: 'repairs', cost: 400 },
    ];
    render(
      <YearlyBreakdownTable
        expenses={expenses}
        finance={finance}
        registrationDate="2024-01-01"
        asOf={asOf}
      />
    );

    const financingRow = screen.getByText('Financing').closest('tr')!;
    const cells = within(financingRow).getAllByRole('cell');
    // cells[0] is the row label; cells[1..3] are 2024/2025/2026; cells[4] is Total.
    expect(cells[1]).toHaveTextContent('AED 0');
    expect(cells[2]).toHaveTextContent('AED 6,000');
    expect(cells[3]).toHaveTextContent('AED 9,000');
    expect(cells[4]).toHaveTextContent('AED 15,000');
  });

  it('shows Not Available (never AED 0) in the Total Cost row for a year with zero data in every category', () => {
    // Registered 2024-01-01, asOf Sept 2026, no finance -> 2024/2025/2026 columns.
    // Only 2026 has any expense data, so 2024 and 2025 should show Not Available
    // in every category row AND in the Total Cost row for those years.
    const expenses: YearlyExpenseLike[] = [
      { date: '2026-05-01', systemCategory: 'fuel', cost: 400 },
    ];
    render(
      <YearlyBreakdownTable
        expenses={expenses}
        finance={noFinance}
        registrationDate="2024-01-01"
        asOf={asOf}
      />
    );

    const totalCostRow = screen.getByText('Total Cost').closest('tr')!;
    const cells = within(totalCostRow).getAllByRole('cell');
    // cells[0] is the row label; cells[1..3] are 2024/2025/2026; cells[4] is Total.
    expect(cells[1]).toHaveTextContent('Not Available');
    expect(cells[2]).toHaveTextContent('Not Available');
    expect(cells[3]).toHaveTextContent('AED 400');
    expect(cells[1]).not.toHaveTextContent('AED 0');
    expect(cells[2]).not.toHaveTextContent('AED 0');
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
