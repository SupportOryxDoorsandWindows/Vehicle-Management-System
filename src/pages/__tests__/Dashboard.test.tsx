import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from '../Dashboard';
import * as vehiclesApi from '../../api/vehicles';
import * as expensesApi from '../../api/expenses';
import type { Vehicle, Expense } from '../../types';

const vehicles: Vehicle[] = [
  { id: 'v1', plate_no: 'U 67931', brand: 'Ford', model: 'Ranger 2021', status: 'active', driver: 'Ronald', department: 'Installation', vehicle_condition: 'Good', vehicle_license_expiry_date: '2026-09-20' } as Vehicle,
  { id: 'v2', plate_no: 'CC 16257', brand: 'Toyota', model: 'Prado 2022', status: 'active', driver: 'Mark', department: 'Installation', vehicle_condition: 'Good', vehicle_license_expiry_date: null } as Vehicle,
];
const expenses: Expense[] = [
  { id: 'e1', vehicle_id: 'v1', cost: 5000, system_category: 'maintenance', date: '2026-01-01' } as Expense,
  { id: 'e2', vehicle_id: null, cost: 200, system_category: 'other', date: '2026-02-01' } as Expense,
];

beforeEach(() => {
  vi.spyOn(vehiclesApi, 'fetchVehicles').mockResolvedValue(vehicles);
  vi.spyOn(expensesApi, 'fetchAllExpenses').mockResolvedValue(expenses);
  vi.spyOn(expensesApi, 'fetchUnassignedExpenses').mockResolvedValue([expenses[1]]);
});

describe('Dashboard', () => {
  it('renders fleet summary tiles and Top 5 by expense', async () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Total Vehicles')).toBeInTheDocument());
    const totalVehiclesTile = screen.getByText('Total Vehicles').parentElement as HTMLElement;
    expect(within(totalVehiclesTile).getByText('2')).toBeInTheDocument(); // Total Vehicles value
    const totalExpensesTile = screen.getByText('Total Fleet Expenses').parentElement as HTMLElement;
    expect(within(totalExpensesTile).getByText('AED 5,200')).toBeInTheDocument(); // Total Fleet Expenses
    const unassignedTile = screen.getByText('Unassigned Expenses').parentElement as HTMLElement;
    expect(within(unassignedTile).getByText('1')).toBeInTheDocument(); // Unassigned Expenses count
    expect(screen.getByText(/Ford Ranger 2021/)).toBeInTheDocument(); // Top 5 by expense
  });
});
