import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { VehicleProfileLayout } from '../VehicleProfileLayout';
import * as vehiclesApi from '../../../api/vehicles';
import type { Vehicle } from '../../../types';

vi.mock('../../../lib/useIsAdmin', () => ({ useIsAdmin: vi.fn(() => false) }));

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/vehicles/:id" element={<VehicleProfileLayout />}>
          <Route index element={<p>Overview tab</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('VehicleProfileLayout', () => {
  it('renders the vehicle header and the active tab', async () => {
    vi.spyOn(vehiclesApi, 'fetchVehicleById').mockResolvedValue({
      id: 'v1',
      plate_no: 'U 67931',
      brand: 'Ford',
      model: 'Ranger 2021',
    } as Vehicle);
    renderAt('/vehicles/v1');

    expect(await screen.findByText('Plate: U 67931')).toBeInTheDocument();
    expect(screen.getByText('Overview tab')).toBeInTheDocument();
  });

  it('shows "Vehicle not found" instead of loading forever for an unknown id', async () => {
    vi.spyOn(vehiclesApi, 'fetchVehicleById').mockResolvedValue(null);
    renderAt('/vehicles/does-not-exist');

    expect(await screen.findByText('Vehicle not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to vehicles/i })).toHaveAttribute('href', '/vehicles');
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('shows an error when the vehicle fails to load', async () => {
    vi.spyOn(vehiclesApi, 'fetchVehicleById').mockRejectedValue({ message: 'Failed to fetch' });
    renderAt('/vehicles/v1');

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load this vehicle.");
  });
});
