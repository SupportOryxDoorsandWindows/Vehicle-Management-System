import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { VehicleProfileLayout } from '../VehicleProfileLayout';
import * as vehiclesApi from '../../../api/vehicles';
import * as documentsApi from '../../../api/documents';
import * as driverPhotosApi from '../../../api/driverPhotos';
import { useIsAdmin } from '../../../lib/useIsAdmin';
import type { DocumentWithUrl } from '../../../types';
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
  beforeEach(() => {
    vi.mocked(useIsAdmin).mockReturnValue(false);
    vi.spyOn(documentsApi, 'fetchLatestVehiclePhoto').mockResolvedValue(null);
    vi.spyOn(driverPhotosApi, 'fetchDriverPhoto').mockResolvedValue(null);
  });

  it('renders the vehicle header, driver and the active tab', async () => {
    vi.spyOn(vehiclesApi, 'fetchVehicleById').mockResolvedValue({
      id: 'v1',
      plate_no: 'U 67931',
      brand: 'Ford',
      model: 'Ranger 2021',
      status: 'active',
      driver: 'Ronald',
      department: 'Installation',
    } as Vehicle);
    renderAt('/vehicles/v1');

    expect(await screen.findByRole('heading', { level: 1, name: 'Ford Ranger 2021' })).toBeInTheDocument();
    const header = screen.getByRole('banner');
    expect(within(header).getByText('U 67931')).toBeInTheDocument();
    expect(within(header).getByText('Active')).toBeInTheDocument();
    expect(within(header).getByText('Ronald')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('Vehicles / U 67931');
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Overview tab')).toBeInTheDocument();
  });

  it('gives Admins Edit vehicle and Add expense for this vehicle, and Viewers neither', async () => {
    vi.spyOn(vehiclesApi, 'fetchVehicleById').mockResolvedValue({
      id: 'v1', plate_no: 'U 67931', brand: 'Ford', model: 'Ranger 2021', status: 'active',
    } as Vehicle);
    const { unmount } = render(
      <MemoryRouter initialEntries={['/vehicles/v1']}>
        <Routes>
          <Route path="/vehicles/:id" element={<VehicleProfileLayout />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('link', { name: 'Edit vehicle' })).not.toBeInTheDocument();
    unmount();

    vi.mocked(useIsAdmin).mockReturnValue(true);
    renderAt('/vehicles/v1');
    expect(await screen.findByRole('link', { name: 'Edit vehicle' })).toHaveAttribute('href', '/vehicles/v1/edit');
    expect(screen.getByRole('link', { name: 'Add expense' })).toHaveAttribute('href', '/expenses/new?vehicle=v1');
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

  it('shows the latest uploaded photo instead of the representative image', async () => {
    vi.spyOn(vehiclesApi, 'fetchVehicleById').mockResolvedValue({
      id: 'v1', plate_no: 'U 67931', brand: 'Ford', model: 'Ranger 2021',
    } as Vehicle);
    vi.spyOn(documentsApi, 'fetchLatestVehiclePhoto').mockResolvedValue({
      id: 'p1', url: 'https://signed.example/photo', file_name: 'front.jpg',
    } as DocumentWithUrl);
    renderAt('/vehicles/v1');

    expect(await screen.findByRole('img', { name: 'Ford Ranger 2021' })).toHaveAttribute('src', 'https://signed.example/photo');
    expect(screen.queryByText(/Representative image/)).not.toBeInTheDocument();
  });

  it('falls back to the representative image when the photo lookup fails', async () => {
    vi.spyOn(vehiclesApi, 'fetchVehicleById').mockResolvedValue({
      id: 'v1', plate_no: 'U 67931', brand: 'Ford', model: 'Ranger 2021',
    } as Vehicle);
    vi.spyOn(documentsApi, 'fetchLatestVehiclePhoto').mockRejectedValue(new Error('storage down'));
    renderAt('/vehicles/v1');

    expect(await screen.findByRole('img', { name: 'Ford Ranger 2021' })).toHaveAttribute(
      'src', expect.stringContaining('vehicle-images/ford-ranger.png')
    );
    expect(screen.getByText(/Representative image/)).toBeInTheDocument();
  });
});
