import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { VehicleReports } from '../VehicleReports';
import * as expensesApi from '../../../api/expenses';
import type { Vehicle, Expense } from '../../../types';

const vehicle: Vehicle = {
  id: 'v1', registration_date: '2024-01-01', last_service_mileage_km: null,
  monthly_repayment: null, finance_amount: null, start_date_of_instalments: null,
} as Vehicle;
const expenses: Expense[] = [
  { id: 'e1', vehicle_id: 'v1', date: '2024-06-01', cost: 3000, system_category: 'insurance' } as Expense,
];

function TestOutlet() {
  return <Outlet context={vehicle} />;
}

beforeEach(() => {
  vi.spyOn(expensesApi, 'fetchExpensesByVehicle').mockResolvedValue(expenses);
});

describe('VehicleReports tab', () => {
  it('renders the Cost of Ownership summary with Not Available for depreciation', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestOutlet />}>
            <Route index element={<VehicleReports />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Total Cost of Ownership')).toBeInTheDocument());
    expect(screen.getAllByText('Not Available').length).toBeGreaterThan(0);
    expect(screen.getAllByText('AED 3,000').length).toBeGreaterThan(0);
  });

  it('renders the Yearly Cost Breakdown table with one column per year plus a Total column', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestOutlet />}>
            <Route index element={<VehicleReports />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Yearly Cost Breakdown')).toBeInTheDocument());
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getAllByText('Total Cost').length).toBeGreaterThan(0);
  });
});
