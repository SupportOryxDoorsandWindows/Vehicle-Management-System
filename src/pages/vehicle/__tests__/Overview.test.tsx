import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Overview } from '../Overview';
import * as driverPhotosApi from '../../../api/driverPhotos';
import { useIsAdmin } from '../../../lib/useIsAdmin';
import type { DriverPhotoWithUrl } from '../../../api/driverPhotos';
import type { Vehicle } from '../../../types';

vi.mock('../../../lib/useIsAdmin', () => ({ useIsAdmin: vi.fn(() => false) }));

const vehicle: Vehicle = {
  plate_no: 'U 67931', brand: 'Ford', model: 'Ranger 2021', type_of_car: 'Pickup',
  vehicle_condition: 'Good', driver: 'Ronald', department: 'Installation',
  chassis_no: 'AFAFP3RP5MJD18678', gear_type: 'Automatic', tyre_size: '215/70R16',
  owner: 'Oryx Door Systems LLC', fuel_type: 'Diesel', seats: '5 seater',
  registration_date: '2020-11-24', last_service_mileage_km: 316585, status: 'active',
  remarks: null,
} as Vehicle;

const photo = {
  id: 'p1', driver_key: 'ronald', driver_name: 'Ronald', storage_path: 'drivers/ronald/x.jpg',
  file_name: 'ronald.jpg', url: 'https://signed.example/ronald',
} as DriverPhotoWithUrl;

function renderTab(v: Vehicle = vehicle) {
  function TestOutlet() {
    return <Outlet context={v} />;
  }
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<TestOutlet />}>
          <Route index element={<Overview />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.mocked(useIsAdmin).mockReturnValue(false);
  vi.spyOn(driverPhotosApi, 'fetchDriverPhoto').mockResolvedValue(null);
  vi.spyOn(driverPhotosApi, 'uploadDriverPhoto').mockResolvedValue(photo);
  vi.spyOn(driverPhotosApi, 'removeDriverPhoto').mockResolvedValue();
});

describe('Overview tab', () => {
  it('renders present fields and Not Available for empty ones', () => {
    renderTab();
    expect(screen.getByText('Ford')).toBeInTheDocument();
    expect(screen.getByText('Automatic')).toBeInTheDocument();
    expect(screen.getByText('Not Available')).toBeInTheDocument(); // remarks is null
  });

  it("shows the driver's uploaded photo", async () => {
    vi.spyOn(driverPhotosApi, 'fetchDriverPhoto').mockResolvedValue(photo);
    renderTab();
    await waitFor(() => expect(screen.getByRole('img', { name: 'Ronald' })).toHaveAttribute('src', photo.url));
    expect(driverPhotosApi.fetchDriverPhoto).toHaveBeenCalledWith('Ronald');
  });

  it('falls back to the photo bundled with the app when none is uploaded', async () => {
    renderTab({ ...vehicle, driver: 'Chris Dawson' });
    await waitFor(() => expect(driverPhotosApi.fetchDriverPhoto).toHaveBeenCalled());
    expect(screen.getByRole('img', { name: 'Chris Dawson' })).toHaveAttribute(
      'src',
      expect.stringContaining('driver-images/chris-dawson.png')
    );
  });

  it('shows a Viewer no photo controls', async () => {
    vi.spyOn(driverPhotosApi, 'fetchDriverPhoto').mockResolvedValue(photo);
    renderTab();
    await waitFor(() => expect(screen.getByRole('img', { name: 'Ronald' })).toHaveAttribute('src', photo.url));
    expect(screen.queryByLabelText(/upload/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove photo/i })).not.toBeInTheDocument();
  });

  it('lets an Admin upload a driver photo and reloads it', async () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);
    renderTab();
    const file = new File(['img'], 'ronald.jpg', { type: 'image/jpeg' });

    await userEvent.upload(await screen.findByLabelText('Upload driver photo'), file);

    expect(driverPhotosApi.uploadDriverPhoto).toHaveBeenCalledWith('Ronald', file);
    await waitFor(() => expect(driverPhotosApi.fetchDriverPhoto).toHaveBeenCalledTimes(2));
  });

  it('lets an Admin replace or remove an existing photo', async () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);
    vi.spyOn(driverPhotosApi, 'fetchDriverPhoto').mockResolvedValue(photo);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderTab();

    expect(await screen.findByLabelText('Upload new driver photo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove photo' }));

    expect(window.confirm).toHaveBeenCalledWith("Remove Ronald's photo?");
    expect(driverPhotosApi.removeDriverPhoto).toHaveBeenCalledWith(photo);
  });

  it('shows why an upload failed', async () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);
    vi.spyOn(driverPhotosApi, 'uploadDriverPhoto').mockRejectedValue(new Error('big.jpg is larger than 10 MB.'));
    renderTab();

    await userEvent.upload(
      await screen.findByLabelText('Upload driver photo'),
      new File(['x'], 'big.jpg', { type: 'image/jpeg' })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('big.jpg is larger than 10 MB.');
  });

  it('offers no upload when the vehicle has no driver', () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);
    renderTab({ ...vehicle, driver: null });
    expect(screen.getByText('Not Assigned')).toBeInTheDocument();
    expect(screen.queryByLabelText(/upload/i)).not.toBeInTheDocument();
    expect(driverPhotosApi.fetchDriverPhoto).not.toHaveBeenCalled();
  });
});
