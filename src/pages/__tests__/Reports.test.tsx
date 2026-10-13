import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Reports } from '../Reports';
import * as vehiclesApi from '../../api/vehicles';
import * as expensesApi from '../../api/expenses';
import * as exportExcel from '../../lib/exportExcel';
import userEventLib from '@testing-library/user-event';
import type { Vehicle, Expense } from '../../types';

const vehicles: Vehicle[] = [
  { id: 'v1', plate_no: 'U 67931', department: 'Installation', driver: 'Ronald' } as Vehicle,
];
const expenses: Expense[] = [
  { id: 'e1', vehicle_id: 'v1', cost: 3000, system_category: 'insurance', date: '2026-01-01' } as Expense,
  { id: 'e2', vehicle_id: null, cost: 500, system_category: 'other', date: '2026-02-01' } as Expense,
];

beforeEach(() => {
  vi.spyOn(vehiclesApi, 'fetchVehicles').mockResolvedValue(vehicles);
  vi.spyOn(expensesApi, 'fetchAllExpenses').mockResolvedValue(expenses);
});

describe('Reports page', () => {
  it('shows fleet-wide totals by category and an unassigned expenses total', async () => {
    render(<Reports />);
    await waitFor(() => expect(screen.getByText('Total Fleet Expenses')).toBeInTheDocument());
    expect(screen.getByText('AED 3,500')).toBeInTheDocument();
    expect(screen.getByText('AED 500')).toBeInTheDocument(); // unassigned total
  });

  it('filters by department', async () => {
    render(<Reports />);
    await waitFor(() => expect(screen.getByText('Total Fleet Expenses')).toBeInTheDocument());
    const { default: userEvent } = await import('@testing-library/user-event');
    await userEvent.selectOptions(screen.getByLabelText(/department/i), 'Installation');
    expect(screen.getByText('AED 3,000')).toBeInTheDocument();
  });

  it('exports the report as Summary, By Category and Expenses sheets', async () => {
    const download = vi.spyOn(exportExcel, 'downloadWorkbook').mockResolvedValue();
    render(<Reports />);
    await userEventLib.click(await screen.findByRole('button', { name: 'Export to Excel' }));
    const [fileName, sheets] = download.mock.calls[0];
    expect(fileName).toMatch(/^fleet-report-/);
    expect(sheets.map((s) => s.name)).toEqual(['Summary', 'By Category', 'Expenses']);
  });

  it('opens the browser print dialog for Save as PDF', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<Reports />);
    await userEventLib.click(await screen.findByRole('button', { name: 'Print / Save as PDF' }));
    expect(print).toHaveBeenCalled();
  });
});
