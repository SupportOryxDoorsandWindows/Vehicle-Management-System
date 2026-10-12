import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { UnassignedExpenses } from '../UnassignedExpenses';
import * as expensesApi from '../../api/expenses';
import * as vehiclesApi from '../../api/vehicles';
import { useIsAdmin } from '../../lib/useIsAdmin';
import type { Expense, Vehicle } from '../../types';

vi.mock('../../lib/useIsAdmin', () => ({ useIsAdmin: vi.fn(() => false) }));

const expenses: Expense[] = [
  { id: 'e1', vehicle_id: null, date: '2026-09-08', expense: 'Staff Uniform', supplier_name: 'Walkahead', cost: 5286.75, raw_vehicle_number_text: null } as Expense,
];
const vehicles: Vehicle[] = [
  { id: 'v1', plate_no: 'U 67931', brand: 'Ford', model: 'Ranger 2021' } as Vehicle,
];

function renderPage() {
  render(
    <MemoryRouter>
      <UnassignedExpenses />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.mocked(useIsAdmin).mockReturnValue(false);
  vi.spyOn(expensesApi, 'fetchUnassignedExpenses').mockResolvedValue(expenses);
  vi.spyOn(vehiclesApi, 'fetchVehicles').mockResolvedValue(vehicles);
  vi.spyOn(expensesApi, 'assignExpenseToVehicle').mockResolvedValue({} as Expense);
});

describe('UnassignedExpenses page', () => {
  it('lists unassigned expenses with a Vehicle Not Assigned label', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Staff Uniform')).toBeInTheDocument());
    expect(screen.getByText('Vehicle Not Assigned')).toBeInTheDocument();
  });

  it('shows no assign, add, or edit controls to a Viewer', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Staff Uniform')).toBeInTheDocument());
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /assign/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /add expense/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /edit/i })).not.toBeInTheDocument();
    expect(vehiclesApi.fetchVehicles).not.toHaveBeenCalled();
  });

  it('lets an Admin assign an expense to a vehicle and reloads the list', async () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);
    renderPage();

    const picker = await screen.findByRole('combobox', { name: 'Vehicle for Staff Uniform' });
    const assignButton = screen.getByRole('button', { name: 'Assign' });
    expect(assignButton).toBeDisabled();

    await userEvent.selectOptions(picker, 'v1');
    expect(screen.getByRole('option', { name: 'U 67931 — Ford Ranger 2021' })).toBeInTheDocument();
    await userEvent.click(assignButton);

    expect(expensesApi.assignExpenseToVehicle).toHaveBeenCalledWith('e1', 'v1');
    await waitFor(() => expect(expensesApi.fetchUnassignedExpenses).toHaveBeenCalledTimes(2));
  });

  it('shows an error when assignment fails', async () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);
    vi.spyOn(expensesApi, 'assignExpenseToVehicle').mockRejectedValue({ message: 'permission denied' });
    renderPage();

    await userEvent.selectOptions(await screen.findByRole('combobox'), 'v1');
    await userEvent.click(screen.getByRole('button', { name: 'Assign' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('permission denied');
  });
});
