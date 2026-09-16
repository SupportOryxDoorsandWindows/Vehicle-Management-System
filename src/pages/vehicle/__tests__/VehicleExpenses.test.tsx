import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { VehicleExpenses } from '../VehicleExpenses';
import * as expensesApi from '../../../api/expenses';
import type { Vehicle, Expense } from '../../../types';

const vehicle: Vehicle = { id: 'v1' } as Vehicle;
const expenses: Expense[] = [
  { id: 'e1', vehicle_id: 'v1', date: '2026-09-01', type_of_expense: 'Service', expense: 'Vehicle Insurance', supplier_name: 'GIG', cost: 3000, system_category: 'insurance' } as Expense,
  { id: 'e2', vehicle_id: 'v1', date: '2026-01-15', type_of_expense: 'Repair', expense: 'Toolbox', supplier_name: 'Laser craft', cost: 400, system_category: 'repairs' } as Expense,
];

function TestOutlet() {
  return <Outlet context={vehicle} />;
}

beforeEach(() => {
  vi.spyOn(expensesApi, 'fetchExpensesByVehicle').mockResolvedValue(expenses);
});

describe('VehicleExpenses tab', () => {
  it('renders each expense row and the total', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestOutlet />}>
            <Route index element={<VehicleExpenses />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Vehicle Insurance')).toBeInTheDocument());
    expect(screen.getByText('Toolbox')).toBeInTheDocument();
    expect(screen.getByText('AED 3,400')).toBeInTheDocument(); // total
  });

  it('filters by expense type', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestOutlet />}>
            <Route index element={<VehicleExpenses />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Vehicle Insurance')).toBeInTheDocument());
    await userEventType();
    async function userEventType() {
      const { default: userEvent } = await import('@testing-library/user-event');
      await userEvent.selectOptions(screen.getByLabelText(/filter by type/i), 'Repair');
    }
    expect(screen.queryByText('Vehicle Insurance')).not.toBeInTheDocument();
    expect(screen.getByText('Toolbox')).toBeInTheDocument();
  });
});
