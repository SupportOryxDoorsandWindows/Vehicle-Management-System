import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Dashboard } from '../Dashboard';
import * as vehiclesApi from '../../api/vehicles';
import * as expensesApi from '../../api/expenses';
import * as serviceRecordsApi from '../../api/serviceRecords';
import { useIsAdmin } from '../../lib/useIsAdmin';
import type { Vehicle, Expense, ServiceRecord } from '../../types';
import { SettingsContext } from '../../lib/useSettings';

vi.mock('../../lib/useIsAdmin', () => ({ useIsAdmin: vi.fn(() => false) }));

const vehicles: Vehicle[] = [
  { id: 'v1', plate_no: 'U 67931', brand: 'Ford', model: 'Ranger 2021', status: 'active', driver: 'Ronald', department: 'Installation', vehicle_license_expiry_date: '2026-09-04' } as Vehicle,
  { id: 'v2', plate_no: 'CC 16257', brand: 'Toyota', model: 'Prado 2022', status: 'active', driver: 'Mark', department: 'Installation', vehicle_license_expiry_date: '2026-09-20' } as Vehicle,
  { id: 'v3', plate_no: 'K 13797', brand: 'Toyota', model: 'Hiace', status: 'active', driver: 'Rex', department: 'Sales', vehicle_license_expiry_date: '2027-05-01' } as Vehicle,
];
const expenses: Expense[] = [
  { id: 'e1', vehicle_id: 'v1', cost: 5000, system_category: 'maintenance', date: '2026-01-01', expense: 'Oil change', supplier_name: 'Al Saeedi' } as Expense,
  { id: 'e2', vehicle_id: null, cost: 200, system_category: 'other', date: '2026-02-01', expense: 'Staff Uniform' } as Expense,
  { id: 'e3', vehicle_id: 'v3', cost: 1000, system_category: 'repairs', date: '2025-06-01', expense: 'Tyres' } as Expense,
];

function Where() {
  const location = useLocation();
  return <p>At {location.pathname + location.search}</p>;
}

function renderDashboard(days = 30) {
  return render(
    <SettingsContext.Provider value={{ expiringSoonDays: days, reload: () => {} }}>
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </SettingsContext.Provider>
  );
}

const figure = async (label: string) => (await screen.findByText(label)).parentElement as HTMLElement;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-01T00:00:00Z'));
  vi.mocked(useIsAdmin).mockReturnValue(false);
  vi.spyOn(vehiclesApi, 'fetchVehicles').mockResolvedValue(vehicles);
  vi.spyOn(expensesApi, 'fetchAllExpenses').mockResolvedValue(expenses);
  vi.spyOn(expensesApi, 'fetchUnassignedExpenses').mockResolvedValue([expenses[1]]);
  vi.spyOn(serviceRecordsApi, 'fetchAllServiceRecords').mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Dashboard', () => {
  it('shows the key figures', async () => {
    renderDashboard();
    expect(within(await figure('Vehicles')).getByText('3')).toBeInTheDocument();
    expect(within(await figure('Vehicles')).getByText('All active · 2 departments')).toBeInTheDocument();
    const spend = await figure('Spend this year');
    expect(within(spend).getByText('AED 5,200')).toBeInTheDocument();
    expect(within(spend).getByText('AED 6,200 all time')).toBeInTheDocument();
    const notAssigned = await figure('Not assigned to a vehicle');
    expect(within(notAssigned).getByText('AED 200')).toBeInTheDocument();
    expect(within(notAssigned).getByText('1 expenses')).toBeInTheDocument();
  });

  it('shows an error instead of zeroed figures when loading fails', async () => {
    vi.spyOn(expensesApi, 'fetchAllExpenses').mockRejectedValue({ message: 'Failed to fetch' });
    renderDashboard();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load the dashboard.");
    expect(alert).toHaveTextContent('Failed to fetch');
    expect(screen.queryByText('Spend this year')).not.toBeInTheDocument();
  });

  it('counts licences due with the configured threshold', async () => {
    const { unmount } = renderDashboard(30);
    const due = await figure('Licences due in 30 days');
    expect(within(due).getByText('2')).toBeInTheDocument(); // v1 in 3 days, v2 in 19
    expect(within(due).getByText('Next: U 67931 on 4 Sep')).toBeInTheDocument();
    unmount();

    renderDashboard(14);
    expect(within(await figure('Licences due in 14 days')).getByText('1')).toBeInTheDocument();
  });

  it('leads Needs attention with the most urgent licence, then the others', async () => {
    renderDashboard();
    const panel = (await screen.findByRole('heading', { name: 'Needs attention' })).closest('section') as HTMLElement;

    expect(within(panel).getByText('Vehicle licence expires in 3 days')).toBeInTheDocument();
    expect(within(panel).getByText('Fri 4 Sep')).toBeInTheDocument();
    expect(within(panel).getByText(/Also expired or due within 30 days: CC 16257 \(20 Sep\)/)).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Review renewals' })).toHaveAttribute('href', '/vehicles?sort=attention');
  });

  it('asks for unassigned expenses to be matched to a plate', async () => {
    renderDashboard();
    expect(await screen.findByText("1 expense isn't assigned to a vehicle")).toBeInTheDocument();
    expect(screen.getByText(/AED 200 is missing from per-vehicle costs/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Assign expenses' })).toHaveAttribute('href', '/unassigned-expenses');
  });

  it('suggests logging readings while the service log is empty', async () => {
    renderDashboard();
    expect(await screen.findByText('No odometer readings logged yet')).toBeInTheDocument();
  });

  it('lists active vehicles whose next service is overdue or due soon', async () => {
    const record = (vehicle_id: string, next_service_date: string) =>
      ({ id: vehicle_id, vehicle_id, record_date: '2026-01-01', kind: 'service', odometer_km: null,
        next_service_date, next_service_km: null, created_at: '2026-01-01T00:00:00Z' }) as ServiceRecord;
    vi.spyOn(serviceRecordsApi, 'fetchAllServiceRecords').mockResolvedValue([
      record('v1', '2020-01-01'), // overdue
      record('v2', '2099-01-01'), // not due
    ]);
    renderDashboard();

    expect(await screen.findByText('1 vehicle is due for a service')).toBeInTheDocument();
    expect(screen.getByText(/^U 67931: overdue/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open service log' })).toHaveAttribute('href', '/vehicles/v1/maintenance');
    expect(screen.queryByText('No odometer readings logged yet')).not.toBeInTheDocument();
  });

  it('still shows the dashboard when the service log fails to load', async () => {
    vi.spyOn(serviceRecordsApi, 'fetchAllServiceRecords').mockRejectedValue(new Error('boom'));
    renderDashboard();
    expect(await screen.findByText('Spend this year')).toBeInTheDocument();
    expect(screen.queryByText(/due for a service|No odometer readings/)).not.toBeInTheDocument();
  });

  it('charts spend by category and vehicles by department', async () => {
    renderDashboard();
    const spend = (await screen.findByRole('heading', { name: 'Spend by category' })).closest('section') as HTMLElement;
    expect(within(spend).getByText('All time · AED 6,200')).toBeInTheDocument();
    expect(within(spend).getByText('Maintenance').nextSibling?.nextSibling).toHaveTextContent('5,000');
    const depts = screen.getByRole('heading', { name: 'Vehicles by department' }).closest('section') as HTMLElement;
    expect(within(depts).getByText('Installation').nextSibling?.nextSibling).toHaveTextContent('2');
  });

  it('lists the highest-cost vehicles and the latest expenses', async () => {
    renderDashboard();
    const top = (await screen.findByRole('heading', { name: 'Highest-cost vehicles' })).closest('section') as HTMLElement;
    const rows = within(top).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('cell')[3].textContent)).toEqual(['AED 5,000', 'AED 1,000']);
    expect(within(rows[0]).getByRole('link', { name: 'U 67931' })).toHaveAttribute('href', '/vehicles/v1');

    const latest = screen.getByRole('heading', { name: 'Latest expenses' }).closest('section') as HTMLElement;
    const expenseRows = within(latest).getAllByRole('row').slice(1);
    expect(expenseRows.map((r) => within(r).getAllByRole('cell')[1].textContent)).toEqual([
      'Staff Uniform',
      'Oil changeAl Saeedi',
      'Tyres',
    ]);
    expect(within(expenseRows[0]).getByRole('link', { name: 'Assign' })).toHaveAttribute('href', '/unassigned-expenses');
  });

  it('searches vehicles from the header', async () => {
    renderDashboard();
    await userEvent.type(await screen.findByRole('searchbox', { name: 'Search vehicles' }), 'Ronald{Enter}');
    expect(screen.getByText('At /vehicles?q=Ronald')).toBeInTheDocument();
  });

  it('gives Admins Add vehicle and Add expense, and Viewers neither', async () => {
    const { unmount } = renderDashboard();
    await screen.findByText('Spend this year');
    expect(screen.queryByRole('link', { name: 'Add vehicle' })).not.toBeInTheDocument();
    unmount();

    vi.mocked(useIsAdmin).mockReturnValue(true);
    renderDashboard();
    expect(await screen.findByRole('link', { name: 'Add vehicle' })).toHaveAttribute('href', '/vehicles/new');
    expect(screen.getByRole('link', { name: 'Add expense' })).toHaveAttribute('href', '/expenses/new');
  });
});
