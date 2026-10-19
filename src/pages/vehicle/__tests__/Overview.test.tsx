import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Overview } from '../Overview';
import { VehicleImageContext, type VehicleImage } from '../../../lib/vehicleImageContext';
import type { Vehicle } from '../../../types';

const vehicle: Vehicle = {
  plate_no: 'U 67931', brand: 'Ford', model: 'Ranger 2021', type_of_car: 'Pickup',
  vehicle_condition: 'Good', driver: 'Ronald', department: 'Installation',
  chassis_no: 'AFAFP3RP5MJD18678', gear_type: 'Automatic', tyre_size: '215/70R16',
  owner: 'Oryx Door Systems LLC', fuel_type: 'Diesel', seats: '5 seater',
  registration_date: '2020-11-24', last_service_mileage_km: 316585, status: 'active',
  remarks: null,
} as Vehicle;

function renderTab(image: VehicleImage = { src: '/vehicle-images/ford-ranger.png', isPhoto: false }) {
  function TestOutlet() {
    return <Outlet context={vehicle} />;
  }
  render(
    <VehicleImageContext.Provider value={image}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestOutlet />}>
            <Route index element={<Overview />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </VehicleImageContext.Provider>
  );
}

const detail = (label: string) => screen.getByText(label).nextElementSibling;

describe('Overview tab', () => {
  it('lists the details, formatted, with Not Available for empty ones', () => {
    renderTab();
    const details = screen.getByRole('region', { name: 'Vehicle details' });
    expect(within(details).getByText('Ford')).toBeInTheDocument();
    expect(detail('Registration Date')).toHaveTextContent('24 Nov 2020');
    expect(detail('Mileage')).toHaveTextContent('316,585 KM');
    expect(detail('Driver')).toHaveTextContent('Ronald');
    expect(detail('Status')).toHaveTextContent('Active');
    expect(detail('Remarks')).toHaveTextContent('Not Available');
  });

  it('shows the vehicle on the 360° stage, rotating until paused', async () => {
    renderTab();
    const stage = screen.getByRole('region', { name: '360 degree vehicle view' });
    const car = within(stage).getByRole('img', { name: 'Ford Ranger 2021, representative image' });
    expect(car).toHaveStyle({ animationPlayState: 'running' });
    expect(within(stage).getByRole('status')).toHaveTextContent('Auto rotating…');

    await userEvent.click(within(stage).getByRole('button', { name: 'Pause rotation' }));
    expect(within(stage).getByRole('img', { name: /Ford Ranger/ })).toHaveStyle({ animationPlayState: 'paused' });
    expect(within(stage).getByRole('status')).toHaveTextContent('Paused');

    await userEvent.click(within(stage).getByRole('button', { name: 'Resume rotation' }));
    expect(within(stage).getByRole('status')).toHaveTextContent('Auto rotating…');
  });

  it('stops on the front view when reset', async () => {
    renderTab();
    const stage = screen.getByRole('region', { name: '360 degree vehicle view' });
    await userEvent.click(within(stage).getByRole('button', { name: 'Reset to front view' }));
    expect(within(stage).getByRole('status')).toHaveTextContent('Paused');
    expect(within(stage).getByRole('button', { name: 'Resume rotation' })).toBeInTheDocument();
  });

  it("names an uploaded photo as the vehicle's own", () => {
    renderTab({ src: 'https://signed/photo', isPhoto: true });
    expect(screen.getByRole('img', { name: 'Ford Ranger 2021' })).toHaveAttribute('src', 'https://signed/photo');
  });

  it('leaves out the stage when there is no image for the vehicle', () => {
    renderTab({ src: null, isPhoto: false });
    expect(screen.queryByRole('region', { name: '360 degree vehicle view' })).not.toBeInTheDocument();
  });
});
