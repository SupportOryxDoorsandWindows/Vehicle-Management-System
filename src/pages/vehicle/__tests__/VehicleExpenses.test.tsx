import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { VehicleExpenses } from '../VehicleExpenses';
import * as expensesApi from '../../../api/expenses';
import * as documentsApi from '../../../api/documents';
import type { Vehicle, Expense } from '../../../types';
import { useIsAdmin } from '../../../lib/useIsAdmin';

vi.mock('../../../lib/useIsAdmin', () => ({ useIsAdmin: vi.fn(() => false) }));

const vehicle: Vehicle = { id: 'v1' } as Vehicle;
const expenses: Expense[] = [
  { id: 'e1', vehicle_id: 'v1', date: '2026-09-01', type_of_expense: 'Service', expense: 'Vehicle Insurance', supplier_name: 'GIG', cost: 3000, system_category: 'insurance' } as Expense,
  { id: 'e2', vehicle_id: 'v1', date: '2026-01-15', type_of_expense: 'Repair', expense: 'Toolbox', supplier_name: 'Laser craft', cost: 400, system_category: 'repairs' } as Expense,
];

function TestOutlet() {
  return <Outlet context={vehicle} />;
}

beforeEach(() => {
  vi.mocked(useIsAdmin).mockReturnValue(false);
  vi.spyOn(expensesApi, 'fetchExpensesByVehicle').mockResolvedValue(expenses);
  vi.spyOn(documentsApi, 'fetchExpenseDocuments').mockResolvedValue([]);
});

describe('VehicleExpenses tab', () => {
  it('renders each expense row and the total', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestOutlet />}>
            <Route index element={<VehicleExpenses />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Vehicle Insurance')).toBeInTheDocument());
    expect(screen.getByText('Toolbox')).toBeInTheDocument();
    expect(screen.getByText('AED 3,400')).toBeInTheDocument(); // total
  });

  it('filters by expense type', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestOutlet />}>
            <Route index element={<VehicleExpenses />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Vehicle Insurance')).toBeInTheDocument());
    await userEventType();
    async function userEventType() {
      const { default: userEvent } = await import('@testing-library/user-event');
      await userEvent.selectOptions(screen.getByLabelText(/filter by type/i), 'Repair');
    }
    expect(screen.queryByText('Vehicle Insurance')).not.toBeInTheDocument();
    expect(screen.getByText('Toolbox')).toBeInTheDocument();
  });
});

describe('VehicleExpenses tab admin controls', () => {
  function renderTab() {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestOutlet />}>
            <Route index element={<VehicleExpenses />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  }

  it('hides Add and Edit from a Viewer', async () => {
    renderTab();
    await waitFor(() => expect(screen.getByText('Vehicle Insurance')).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /add expense/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('shows an Admin Add (preset to this vehicle) and per-row Edit links', async () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);
    renderTab();
    await waitFor(() => expect(screen.getByText('Vehicle Insurance')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /add expense/i })).toHaveAttribute('href', '/expenses/new?vehicle=v1');
    expect(screen.getAllByRole('link', { name: 'Edit' }).map((l) => l.getAttribute('href'))).toEqual([
      '/expenses/e1/edit',
      '/expenses/e2/edit',
    ]);
  });
});

describe('VehicleExpenses tab files', () => {
  function renderTab() {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestOutlet />}>
            <Route index element={<VehicleExpenses />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  }

  it('links each expense to its uploaded attachments', async () => {
    vi.spyOn(documentsApi, 'fetchExpenseDocuments').mockResolvedValue([
      { id: 'd1', expense_id: 'e2', vehicle_id: null, kind: 'invoice', file_name: 'Toolbox invoice.pdf',
        storage_path: 'p', content_type: 'application/pdf', size_bytes: 2048, uploaded_by: 'u', uploaded_at: '',
        url: 'https://signed.example/inv' },
    ]);
    renderTab();
    const link = await screen.findByRole('link', { name: 'Toolbox invoice.pdf' });
    expect(link.closest('tr')).toHaveTextContent('Toolbox');
    expect(link).toHaveAttribute('href', 'https://signed.example/inv');
    expect(documentsApi.fetchExpenseDocuments).toHaveBeenCalledWith(['e1', 'e2']);
  });

  it('still shows expenses when attachments fail to load', async () => {
    vi.spyOn(documentsApi, 'fetchExpenseDocuments').mockRejectedValue(new Error('storage down'));
    renderTab();
    await waitFor(() => expect(screen.getByText('Vehicle Insurance')).toBeInTheDocument());
    expect(screen.getAllByText('Unavailable')).toHaveLength(2);
  });
});
