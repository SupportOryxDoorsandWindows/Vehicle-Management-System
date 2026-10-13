import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from '../Dashboard';
import * as vehiclesApi from '../../api/vehicles';
import * as expensesApi from '../../api/expenses';
import * as serviceRecordsApi from '../../api/serviceRecords';
import type { Vehicle, Expense, ServiceRecord } from '../../types';
import { SettingsContext } from '../../lib/useSettings';

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
  vi.spyOn(serviceRecordsApi, 'fetchAllServiceRecords').mockResolvedValue([]);
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

  it('shows an error instead of zeroed tiles when loading fails', async () => {
    vi.spyOn(expensesApi, 'fetchAllExpenses').mockRejectedValue({ message: 'Failed to fetch' });
    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load the dashboard.");
    expect(alert).toHaveTextContent('Failed to fetch');
    expect(screen.queryByText('Total Fleet Expenses')).not.toBeInTheDocument();
  });

  it('counts Upcoming Renewals with the configured threshold', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-01T00:00:00Z')); // v1's licence expires 2026-09-20: 19 days away
    try {
      const tile = async (days: number) => {
        const { unmount } = render(
          <SettingsContext.Provider value={{ expiringSoonDays: days, reload: () => {} }}>
            <MemoryRouter><Dashboard /></MemoryRouter>
          </SettingsContext.Provider>
        );
        const value = within(
          (await screen.findByText('Upcoming Renewals')).parentElement as HTMLElement
        ).getByText(/^\d+$/).textContent;
        unmount();
        return value;
      };
      expect(await tile(30)).toBe('1');
      expect(await tile(14)).toBe('0');
    } finally {
      vi.useRealTimers();
    }
  });

  it('counts active vehicles whose next service is overdue or due soon', async () => {
    const record = (vehicle_id: string, next_service_date: string) =>
      ({ id: vehicle_id, vehicle_id, record_date: '2026-01-01', kind: 'service', odometer_km: null,
        next_service_date, next_service_km: null, created_at: '2026-01-01T00:00:00Z' }) as ServiceRecord;
    vi.spyOn(serviceRecordsApi, 'fetchAllServiceRecords').mockResolvedValue([
      record('v1', '2020-01-01'), // overdue
      record('v2', '2099-01-01'), // not due
    ]);
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    const tile = (await screen.findByText('Services Due')).parentElement as HTMLElement;
    expect(within(tile).getByText('1')).toBeInTheDocument();
  });

  it('still shows the dashboard when the service log fails to load', async () => {
    vi.spyOn(serviceRecordsApi, 'fetchAllServiceRecords').mockRejectedValue(new Error('boom'));
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    const tile = (await screen.findByText('Services Due')).parentElement as HTMLElement;
    expect(within(tile).getByText('Not Available')).toBeInTheDocument();
  });
});
