import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { ServiceRecordForm } from '../ServiceRecordForm';
import * as serviceRecordsApi from '../../../api/serviceRecords';
import type { ServiceRecord, Vehicle } from '../../../types';

const vehicle = { id: 'v1', plate_no: 'U 67931' } as Vehicle;
const existing: ServiceRecord = {
  id: 'r1', vehicle_id: 'v1', record_date: '2026-08-01', kind: 'service', odometer_km: 310000,
  garage: 'Saluki', description: null, next_service_date: null, next_service_km: 320000,
  created_by: 'u1', created_at: '2026-08-01T00:00:00Z',
};

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/vehicles/:id" element={<Outlet context={vehicle} />}>
          <Route path="maintenance" element={<p>Maintenance tab</p>} />
          <Route path="maintenance/new" element={<ServiceRecordForm />} />
          <Route path="maintenance/:recordId/edit" element={<ServiceRecordForm />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.spyOn(serviceRecordsApi, 'fetchServiceRecords').mockResolvedValue([existing]);
  vi.spyOn(serviceRecordsApi, 'createServiceRecord').mockImplementation(
    async (input) => ({ ...existing, ...input, id: 'new' }) as ServiceRecord
  );
  vi.spyOn(serviceRecordsApi, 'updateServiceRecord').mockImplementation(
    async (id, input) => ({ ...existing, ...input, id }) as ServiceRecord
  );
});

describe('ServiceRecordForm', () => {
  it('adds an odometer reading for this vehicle, dated today by default', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 13, 9, 0));
    try {
      renderAt('/vehicles/v1/maintenance/new');
      expect(await screen.findByLabelText(/^date/i)).toHaveValue('2026-10-13');
      await userEvent.selectOptions(screen.getByLabelText(/^type/i), 'reading');
      await userEvent.type(screen.getByLabelText(/^odometer/i), '319,400');
      await userEvent.click(screen.getByRole('button', { name: 'Add record' }));

      expect(await screen.findByText('Maintenance tab')).toBeInTheDocument();
      expect(serviceRecordsApi.createServiceRecord).toHaveBeenCalledWith(
        expect.objectContaining({ vehicle_id: 'v1', record_date: '2026-10-13', kind: 'reading', odometer_km: 319400, garage: null })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('requires the odometer for a plain reading, and a date', async () => {
    renderAt('/vehicles/v1/maintenance/new');
    await userEvent.selectOptions(await screen.findByLabelText(/^type/i), 'reading');
    await userEvent.clear(screen.getByLabelText(/^date/i));
    await userEvent.click(screen.getByRole('button', { name: 'Add record' }));

    expect(screen.getByText('Odometer (KM) is required for an odometer reading.')).toBeInTheDocument();
    expect(screen.getByText('Date is required.')).toBeInTheDocument();
    expect(serviceRecordsApi.createServiceRecord).not.toHaveBeenCalled();
  });

  it('prefills and saves an existing record', async () => {
    renderAt('/vehicles/v1/maintenance/r1/edit');
    const garage = await screen.findByLabelText(/^garage/i);
    expect(garage).toHaveValue('Saluki');
    expect(screen.getByLabelText(/next service \(km\)/i)).toHaveValue('320000');
    await userEvent.clear(garage);
    await userEvent.type(garage, 'Al Futtaim');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Maintenance tab')).toBeInTheDocument();
    expect(serviceRecordsApi.updateServiceRecord).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({ garage: 'Al Futtaim', odometer_km: 310000 })
    );
  });

  it('keeps the form and shows the error when saving fails', async () => {
    vi.spyOn(serviceRecordsApi, 'updateServiceRecord').mockRejectedValue(new Error('permission denied'));
    renderAt('/vehicles/v1/maintenance/r1/edit');
    await userEvent.click(await screen.findByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('permission denied');
    expect(screen.getByLabelText(/^garage/i)).toHaveValue('Saluki');
  });

  it('deletes a record after confirming', async () => {
    const remove = vi.spyOn(serviceRecordsApi, 'deleteServiceRecord').mockResolvedValue();
    renderAt('/vehicles/v1/maintenance/r1/edit');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete record' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));
    expect(await screen.findByText('Maintenance tab')).toBeInTheDocument();
    expect(remove).toHaveBeenCalledWith('r1');
  });

  it("says so when the record doesn't belong to this vehicle or no longer exists", async () => {
    renderAt('/vehicles/v1/maintenance/other/edit');
    expect(await screen.findByText(/doesn't exist or may have been deleted/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Maintenance' })).toHaveAttribute('href', '/vehicles/v1/maintenance');
  });
});
