import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { VehicleForm } from '../VehicleForm';
import * as vehiclesApi from '../../api/vehicles';
import type { Vehicle } from '../../types';

const existing = {
  id: 'v1',
  plate_no: 'U 67931',
  brand: 'Ford',
  model: 'Ranger 2021',
  status: 'active',
  finance_amount: 85000,
  driver: null,
} as Vehicle;

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/vehicles/new" element={<VehicleForm />} />
        <Route path="/vehicles/:id/edit" element={<VehicleForm />} />
        <Route path="/vehicles/:id" element={<p>Profile page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.spyOn(vehiclesApi, 'fetchVehicleById').mockResolvedValue(existing);
  vi.spyOn(vehiclesApi, 'createVehicle').mockResolvedValue({ ...existing, id: 'new-id' });
  vi.spyOn(vehiclesApi, 'updateVehicle').mockResolvedValue(existing);
});

describe('VehicleForm', () => {
  it('creates a vehicle with a normalised plate and blanks saved as null', async () => {
    renderAt('/vehicles/new');
    await userEvent.type(await screen.findByLabelText(/plate number/i), '  cc   16257 ');
    await userEvent.type(screen.getByLabelText(/^make/i), 'Toyota');
    await userEvent.type(screen.getByLabelText(/finance amount/i), '120,000');
    await userEvent.click(screen.getByRole('button', { name: 'Add vehicle' }));

    expect(await screen.findByText('Profile page')).toBeInTheDocument();
    const input = vi.mocked(vehiclesApi.createVehicle).mock.calls[0][0];
    expect(input).toMatchObject({
      plate_no: 'CC 16257',
      brand: 'Toyota',
      status: 'active',
      finance_amount: 120000,
      driver: null,
    });
  });

  it('shows field errors and does not save when the plate is missing', async () => {
    renderAt('/vehicles/new');
    await userEvent.click(await screen.findByRole('button', { name: 'Add vehicle' }));

    expect(screen.getByText('Plate Number is required.')).toBeInTheDocument();
    expect(vehiclesApi.createVehicle).not.toHaveBeenCalled();
  });

  it('explains a duplicate plate and keeps what was typed', async () => {
    vi.spyOn(vehiclesApi, 'createVehicle').mockRejectedValue({ code: '23505', message: 'duplicate key' });
    renderAt('/vehicles/new');
    await userEvent.type(await screen.findByLabelText(/plate number/i), 'u 67931');
    await userEvent.click(screen.getByRole('button', { name: 'Add vehicle' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A vehicle with plate U 67931 already exists.');
    expect(screen.getByLabelText(/plate number/i)).toHaveValue('u 67931');
  });

  it('prefills an existing vehicle and saves changes', async () => {
    renderAt('/vehicles/v1/edit');
    const driver = await screen.findByLabelText(/^driver/i);
    expect(screen.getByLabelText(/plate number/i)).toHaveValue('U 67931');
    expect(screen.getByLabelText(/finance amount/i)).toHaveValue('85000');

    await userEvent.type(driver, 'Ronald');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Profile page')).toBeInTheDocument();
    expect(vehiclesApi.updateVehicle).toHaveBeenCalledWith(
      'v1',
      expect.objectContaining({ driver: 'Ronald', plate_no: 'U 67931', finance_amount: 85000 })
    );
  });

  it('shows "Vehicle not found" when editing an unknown id', async () => {
    vi.spyOn(vehiclesApi, 'fetchVehicleById').mockResolvedValue(null);
    renderAt('/vehicles/missing/edit');
    expect(await screen.findByText('Vehicle not found')).toBeInTheDocument();
  });
});
