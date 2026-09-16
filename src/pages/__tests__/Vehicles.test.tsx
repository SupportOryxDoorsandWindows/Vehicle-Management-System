import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Vehicles } from '../Vehicles';
import * as vehiclesApi from '../../api/vehicles';
import * as expensesApi from '../../api/expenses';
import type { Vehicle, Expense } from '../../types';

const vehicles: Vehicle[] = [
  { id: 'v1', plate_no: 'U 67931', brand: 'Ford', model: 'Ranger 2021', driver: 'Ronald', department: 'Installation', vehicle_condition: 'Good', status: 'active' } as Vehicle,
  { id: 'v2', plate_no: 'CC 16257', brand: 'Toyota', model: 'Prado 2022', driver: 'Mark', department: 'Installation', vehicle_condition: 'Good', status: 'active' } as Vehicle,
];
const expenses: Expense[] = [
  { id: 'e1', vehicle_id: 'v1', cost: 1000 } as Expense,
];

beforeEach(() => {
  vi.spyOn(vehiclesApi, 'fetchVehicles').mockResolvedValue(vehicles);
  vi.spyOn(expensesApi, 'fetchAllExpenses').mockResolvedValue(expenses);
});

describe('Vehicles page', () => {
  it('renders a card per vehicle with computed total expenses', async () => {
    render(<MemoryRouter><Vehicles /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Ford Ranger 2021/)).toBeInTheDocument());
    expect(screen.getByText(/Toyota Prado 2022/)).toBeInTheDocument();
    expect(screen.getByText(/AED 1,000/)).toBeInTheDocument();
  });

  it('filters by search text across plate, model, driver, and department', async () => {
    render(<MemoryRouter><Vehicles /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Ford Ranger 2021/)).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText(/search/i), 'Prado');
    expect(screen.queryByText(/Ford Ranger 2021/)).not.toBeInTheDocument();
    expect(screen.getByText(/Toyota Prado 2022/)).toBeInTheDocument();
  });

  it('filters by department dropdown', async () => {
    render(<MemoryRouter><Vehicles /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Ford Ranger 2021/)).toBeInTheDocument());
    await userEvent.selectOptions(screen.getByLabelText(/department/i), 'Installation');
    expect(screen.getByText(/Ford Ranger 2021/)).toBeInTheDocument();
    expect(screen.getByText(/Toyota Prado 2022/)).toBeInTheDocument();
  });

  it('filters by status dropdown', async () => {
    render(<MemoryRouter><Vehicles /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Ford Ranger 2021/)).toBeInTheDocument());
    await userEvent.selectOptions(screen.getByLabelText(/status/i), 'inactive');
    expect(screen.queryByText(/Ford Ranger 2021/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Toyota Prado 2022/)).not.toBeInTheDocument();
  });

  it('toggles to a table view listing the same filtered vehicles as rows', async () => {
    render(<MemoryRouter><Vehicles /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Ford Ranger 2021/)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /table view/i }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'U 67931' })).toBeInTheDocument();
  });
});
