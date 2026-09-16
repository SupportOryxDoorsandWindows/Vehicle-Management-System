import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VehicleCard } from '../VehicleCard';
import type { Vehicle } from '../../types';

const vehicle: Vehicle = {
  id: 'v1',
  plate_no: 'U 67931',
  brand: 'Ford',
  model: 'Ranger 2021',
  driver: 'Ronald Abrea Samontina',
  department: 'Installation',
  vehicle_condition: 'Good',
  status: 'active',
} as Vehicle;

describe('VehicleCard', () => {
  it('shows make, model, plate, driver, department, condition, status, and total expenses', () => {
    render(
      <MemoryRouter>
        <VehicleCard vehicle={vehicle} totalExpenses={5000} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Ford Ranger 2021/)).toBeInTheDocument();
    expect(screen.getByText(/U 67931/)).toBeInTheDocument();
    expect(screen.getByText(/Ronald Abrea Samontina/)).toBeInTheDocument();
    expect(screen.getByText(/Installation/)).toBeInTheDocument();
    expect(screen.getByText(/Good/)).toBeInTheDocument();
    expect(screen.getByText(/AED 5,000/)).toBeInTheDocument();
  });

  it('shows Not Assigned when driver is missing', () => {
    render(
      <MemoryRouter>
        <VehicleCard vehicle={{ ...vehicle, driver: null }} totalExpenses={0} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Not Assigned/)).toBeInTheDocument();
  });

  it('shows Not Available in the title when brand or model is missing', () => {
    render(
      <MemoryRouter>
        <VehicleCard vehicle={{ ...vehicle, brand: null, model: null }} totalExpenses={0} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Not Available Not Available/)).toBeInTheDocument();
  });
});
