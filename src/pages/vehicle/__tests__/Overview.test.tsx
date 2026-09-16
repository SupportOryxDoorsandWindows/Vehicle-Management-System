import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Overview } from '../Overview';
import type { Vehicle } from '../../../types';

const vehicle: Vehicle = {
  plate_no: 'U 67931', brand: 'Ford', model: 'Ranger 2021', type_of_car: 'Pickup',
  vehicle_condition: 'Good', driver: 'Ronald', department: 'Installation',
  chassis_no: 'AFAFP3RP5MJD18678', gear_type: 'Automatic', tyre_size: '215/70R16',
  owner: 'Oryx Door Systems LLC', fuel_type: 'Diesel', seats: '5 seater',
  registration_date: '2020-11-24', last_service_mileage_km: 316585, status: 'active',
  remarks: null,
} as Vehicle;

function TestOutlet() {
  return <Outlet context={vehicle} />;
}

describe('Overview tab', () => {
  it('renders present fields and Not Available for empty ones', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestOutlet />}>
            <Route index element={<Overview />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Ford')).toBeInTheDocument();
    expect(screen.getByText('Automatic')).toBeInTheDocument();
    expect(screen.getByText('Not Available')).toBeInTheDocument(); // remarks is null
  });
});
