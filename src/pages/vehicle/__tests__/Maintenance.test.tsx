import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Maintenance } from '../Maintenance';
import * as expensesApi from '../../../api/expenses';
import type { Vehicle, Expense } from '../../../types';

const vehicle: Vehicle = { id: 'v1', last_service_mileage_km: 309867 } as Vehicle;
const expenses: Expense[] = [
  { id: 'e1', vehicle_id: 'v1', date: '2026-09-15', expense: 'Brake Repair', supplier_name: 'Saluki', cost: 1250, expense_description: 'Front brake replacement', system_category: 'repairs' } as Expense,
  { id: 'e2', vehicle_id: 'v1', date: '2026-01-01', expense: 'Vehicle Insurance', supplier_name: 'GIG', cost: 3000, expense_description: null, system_category: 'insurance' } as Expense,
];

function TestOutlet() {
  return <Outlet context={vehicle} />;
}

beforeEach(() => {
  vi.spyOn(expensesApi, 'fetchExpensesByVehicle').mockResolvedValue(expenses);
});

describe('Maintenance tab', () => {
  it('lists only maintenance/repairs expenses, not insurance', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestOutlet />}>
            <Route index element={<Maintenance />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Brake Repair')).toBeInTheDocument());
    expect(screen.getByText('309,867 KM')).toBeInTheDocument();
    expect(screen.queryByText('Vehicle Insurance')).not.toBeInTheDocument();
  });
});
