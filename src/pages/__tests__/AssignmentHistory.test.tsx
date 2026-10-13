import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AssignmentHistory } from '../AssignmentHistory';
import * as historyApi from '../../api/history';
import * as profilesApi from '../../api/profiles';
import * as vehiclesApi from '../../api/vehicles';
import * as exportExcel from '../../lib/exportExcel';
import type { AssignmentHistoryEntry } from '../../api/history';
import type { DeletedRecord, Vehicle } from '../../types';

const ranger = { id: 'v1', plate_no: 'U 67931' };
const prado = { id: 'v2', plate_no: 'CC 16257' };
const entries: AssignmentHistoryEntry[] = [
  {
    id: 'a2', assigned_at: '2026-10-12T09:30:00Z', assigned_by: 'u1',
    expense: { id: 'e1', date: '2026-09-08', expense: 'Staff Uniform', cost: 5286.75 },
    previous: ranger, assigned: prado,
  },
  {
    id: 'a1', assigned_at: '2026-10-11T08:00:00Z', assigned_by: 'system',
    expense: { id: 'e2', date: '2026-08-01', expense: 'Tyres', cost: 900 },
    previous: null, assigned: ranger,
  },
  {
    id: 'a0', assigned_at: '2026-10-10T08:00:00Z', assigned_by: 'gone-user',
    expense: { id: 'e3', date: null, expense: 'Car wash', cost: 50 },
    previous: prado, assigned: null,
  },
];

const deletions: DeletedRecord[] = [
  {
    id: 'd2', table_name: 'expenses', record_id: 'e9', deleted_by: 'u1', deleted_at: '2026-10-13T10:00:00Z',
    record: { id: 'e9', expense: 'Oil change', cost: 350, vehicle_id: 'v1' },
  },
  {
    id: 'd1', table_name: 'vehicles', record_id: 'v9', deleted_by: null, deleted_at: '2026-10-13T09:00:00Z',
    record: { id: 'v9', plate_no: 'AA19764' },
  },
  {
    id: 'd0', table_name: 'service_records', record_id: 's1', deleted_by: 'u1', deleted_at: '2026-10-13T08:00:00Z',
    record: { id: 's1', kind: 'reading', record_date: '2026-10-01', vehicle_id: 'v9' },
  },
];

function renderPage() {
  render(
    <MemoryRouter>
      <AssignmentHistory />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.spyOn(historyApi, 'fetchAssignmentHistory').mockResolvedValue(entries);
  vi.spyOn(historyApi, 'fetchDeletedRecords').mockResolvedValue([]);
  vi.spyOn(vehiclesApi, 'fetchVehicles').mockResolvedValue([ranger, prado] as Vehicle[]);
  vi.spyOn(profilesApi, 'fetchProfiles').mockResolvedValue([
    { id: 'u1', email: 'admin@oryxdoors.com', role: 'admin', active: true, created_at: '', updated_at: '' },
  ]);
});

describe('AssignmentHistory', () => {
  it('lists each change with expense, from, to and who made it', async () => {
    renderPage();
    const row = (await screen.findByRole('link', { name: 'Staff Uniform' })).closest('tr')!;
    expect(within(row).getByRole('link', { name: 'Staff Uniform' })).toHaveAttribute('href', '/expenses/e1/edit');
    expect(within(row).getByRole('link', { name: 'U 67931' })).toHaveAttribute('href', '/vehicles/v1');
    expect(within(row).getByRole('link', { name: 'CC 16257' })).toHaveAttribute('href', '/vehicles/v2');
    expect(within(row).getByText('admin@oryxdoors.com')).toBeInTheDocument();
    expect(within(row).getByText('AED 5,287')).toBeInTheDocument();

    const tyres = screen.getByRole('link', { name: 'Tyres' }).closest('tr')!;
    expect(within(tyres).getByText('Not assigned')).toBeInTheDocument();
    expect(within(tyres).getByText('System')).toBeInTheDocument();

    const wash = screen.getByRole('link', { name: 'Car wash' }).closest('tr')!;
    expect(within(wash).getByText('Unknown user')).toBeInTheDocument();
  });

  it('filters to changes involving one vehicle, on either side', async () => {
    renderPage();
    await screen.findByRole('link', { name: 'Staff Uniform' });
    await userEvent.selectOptions(screen.getByLabelText('Vehicle'), 'v2');
    expect(screen.getByRole('link', { name: 'Staff Uniform' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Car wash' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Tyres' })).not.toBeInTheDocument();
  });

  it('says so when there is no history yet', async () => {
    vi.spyOn(historyApi, 'fetchAssignmentHistory').mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No assignment changes recorded yet.')).toBeInTheDocument();
  });

  it('exports the rows shown', async () => {
    const download = vi.spyOn(exportExcel, 'downloadWorkbook').mockResolvedValue();
    renderPage();
    await screen.findByRole('link', { name: 'Staff Uniform' });
    await userEvent.selectOptions(screen.getByLabelText('Vehicle'), 'v2');
    await userEvent.click(screen.getByRole('button', { name: 'Export to Excel' }));
    const [, sheets] = download.mock.calls[0];
    expect(sheets[0].rows.map((r) => r[1])).toEqual(['Staff Uniform', 'Car wash']);
    expect(sheets[0].rows.map((r) => r[6])).toEqual(['admin@oryxdoors.com', 'Unknown user']);
  });

  it('shows an error when history fails to load', async () => {
    vi.spyOn(historyApi, 'fetchAssignmentHistory').mockRejectedValue(new Error('permission denied'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load assignment history.");
  });

  it('shows a deleted expense in history as "Deleted expense"', async () => {
    vi.spyOn(historyApi, 'fetchAssignmentHistory').mockResolvedValue([
      { ...entries[0], id: 'a9', expense: null },
    ]);
    renderPage();
    expect(await screen.findByText('Deleted expense')).toBeInTheDocument();
  });

  it('lists deleted records with what they were, including plates of deleted vehicles', async () => {
    vi.spyOn(historyApi, 'fetchDeletedRecords').mockResolvedValue(deletions);
    renderPage();
    const expense = (await screen.findByText('Expense: Oil change (AED 350), U 67931')).closest('tr')!;
    expect(within(expense).getByText('admin@oryxdoors.com')).toBeInTheDocument();
    const vehicle = screen.getByText('Vehicle AA19764').closest('tr')!;
    expect(within(vehicle).getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Service record: Odometer reading only on 2026-10-01, AA19764')).toBeInTheDocument();
  });

  it('says so when nothing has been deleted', async () => {
    renderPage();
    expect(await screen.findByText('Nothing has been deleted.')).toBeInTheDocument();
  });

  it('exports deletions as a second sheet', async () => {
    const download = vi.spyOn(exportExcel, 'downloadWorkbook').mockResolvedValue();
    vi.spyOn(historyApi, 'fetchDeletedRecords').mockResolvedValue(deletions);
    renderPage();
    await screen.findByText('Vehicle AA19764');
    await userEvent.click(screen.getByRole('button', { name: 'Export to Excel' }));
    const [, sheets] = download.mock.calls[0];
    expect(sheets[1].name).toBe('Deleted Records');
    expect(sheets[1].rows.map((r) => r[1])).toEqual([
      'Expense: Oil change (AED 350), U 67931',
      'Vehicle AA19764',
      'Service record: Odometer reading only on 2026-10-01, AA19764',
    ]);
  });
});
