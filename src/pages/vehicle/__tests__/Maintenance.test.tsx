import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Maintenance } from '../Maintenance';
import * as expensesApi from '../../../api/expenses';
import * as serviceRecordsApi from '../../../api/serviceRecords';
import { useIsAdmin } from '../../../lib/useIsAdmin';
import type { Vehicle, Expense, ServiceRecord } from '../../../types';

vi.mock('../../../lib/useIsAdmin', () => ({ useIsAdmin: vi.fn(() => false) }));

const vehicle: Vehicle = { id: 'v1', plate_no: 'U 67931', last_service_mileage_km: 309867 } as Vehicle;
const expenses: Expense[] = [
  { id: 'e1', vehicle_id: 'v1', date: '2026-09-15', expense: 'Brake Repair', supplier_name: 'Saluki', cost: 1250, expense_description: 'Front brake replacement', system_category: 'repairs' } as Expense,
  { id: 'e2', vehicle_id: 'v1', date: '2026-01-01', expense: 'Vehicle Insurance', supplier_name: 'GIG', cost: 3000, expense_description: null, system_category: 'insurance' } as Expense,
];
const log: ServiceRecord[] = [
  { id: 'r2', vehicle_id: 'v1', record_date: '2026-10-01', kind: 'reading', odometer_km: 319400, garage: null, description: null, next_service_date: null, next_service_km: null, created_by: null, created_at: '2026-10-01T00:00:00Z' },
  { id: 'r1', vehicle_id: 'v1', record_date: '2026-08-01', kind: 'service', odometer_km: 310000, garage: 'Saluki', description: 'Oil and filters', next_service_date: null, next_service_km: 320000, created_by: null, created_at: '2026-08-01T00:00:00Z' },
];

function renderTab() {
  render(
    <MemoryRouter initialEntries={['/vehicles/v1/maintenance']}>
      <Routes>
        <Route path="/vehicles/:id" element={<Outlet context={vehicle} />}>
          <Route path="maintenance" element={<Maintenance />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.mocked(useIsAdmin).mockReturnValue(false);
  vi.spyOn(expensesApi, 'fetchExpensesByVehicle').mockResolvedValue(expenses);
  vi.spyOn(serviceRecordsApi, 'fetchServiceRecords').mockResolvedValue(log);
});

describe('Maintenance tab', () => {
  it('lists only maintenance/repairs expenses, not insurance', async () => {
    renderTab();
    expect(await screen.findByText('Brake Repair')).toBeInTheDocument();
    expect(screen.queryByText('Vehicle Insurance')).not.toBeInTheDocument();
  });

  it('summarises the odometer, last service and next service from the log', async () => {
    renderTab();
    const odometer = (await screen.findByText('Current Odometer')).parentElement!;
    expect(within(odometer).getByText(/319,400 KM/)).toBeInTheDocument();
    expect(within(odometer).getByText('on 2026-10-01')).toBeInTheDocument();
    const last = screen.getByText('Last Service').parentElement!;
    expect(within(last).getByText(/2026-08-01/)).toBeInTheDocument();
    expect(within(last).getByText('at 310,000 KM')).toBeInTheDocument();
    const next = screen.getByText('Next Service', { selector: 'p' }).parentElement!;
    expect(within(next).getByText('320,000 KM')).toBeInTheDocument();
    expect(within(next).getByText('Due Soon')).toBeInTheDocument(); // 600 KM to go
  });

  it('lists every log entry, newest first', async () => {
    renderTab();
    const reading = (await screen.findByText('Odometer reading only')).closest('tr')!;
    expect(within(reading).getByText('319,400 KM')).toBeInTheDocument();
    const service = screen.getByText('Oil and filters').closest('tr')!;
    expect(within(service).getByText('Saluki')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows.indexOf(reading)).toBeLessThan(rows.indexOf(service));
  });

  it('falls back to the imported last service mileage before anything is logged', async () => {
    vi.spyOn(serviceRecordsApi, 'fetchServiceRecords').mockResolvedValue([]);
    renderTab();
    const last = (await screen.findByText('Last Service')).parentElement!;
    expect(within(last).getByText(/309,867 KM/)).toBeInTheDocument();
    expect(within(last).getByText('from the original spreadsheet')).toBeInTheDocument();
    expect(screen.getByText('No services or odometer readings logged yet.')).toBeInTheDocument();
  });

  it('gives Admins Add and Edit links, and Viewers neither', async () => {
    renderTab();
    await screen.findByText('Oil and filters');
    expect(screen.queryByRole('link', { name: 'Add record' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('links Admins to add and edit records', async () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);
    renderTab();
    expect(await screen.findByRole('link', { name: 'Add record' })).toHaveAttribute(
      'href',
      '/vehicles/v1/maintenance/new'
    );
    expect(screen.getAllByRole('link', { name: 'Edit' })[1]).toHaveAttribute(
      'href',
      '/vehicles/v1/maintenance/r1/edit'
    );
  });
});
