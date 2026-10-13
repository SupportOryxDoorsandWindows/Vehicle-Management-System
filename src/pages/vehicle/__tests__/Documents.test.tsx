import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Documents } from '../Documents';
import * as documentsApi from '../../../api/documents';
import { useIsAdmin } from '../../../lib/useIsAdmin';
import { SettingsContext } from '../../../lib/useSettings';
import type { DocumentWithUrl, StoredDocument, Vehicle } from '../../../types';

vi.mock('../../../lib/useIsAdmin', () => ({ useIsAdmin: vi.fn(() => false) }));

const vehicle: Vehicle = {
  id: 'v1',
  vehicle_license_expiry_date: '2026-10-01', // expiring soon relative to the pinned system time below
  cid_permit_expiry: '2020-01-01', // expired
  advertisement_permit_expiry: null, // not available
  upload_mulkiya: '1762756090175537_Registration_Card_2026.pdf',
  upload_photos_documents: '1738002266832_Policy_Certificate.pdf,1738002284414_Handbook.pdf,',
} as Vehicle;

function doc(overrides: Partial<DocumentWithUrl>): DocumentWithUrl {
  return {
    id: 'd1',
    vehicle_id: 'v1',
    expense_id: null,
    kind: 'mulkiya',
    storage_path: 'vehicles/v1/mulkiya/x-card.pdf',
    file_name: 'Registration Card.pdf',
    content_type: 'application/pdf',
    size_bytes: 250_000,
    uploaded_by: 'u1',
    uploaded_at: '2026-10-01T00:00:00Z',
    url: 'https://signed.example/card',
    ...overrides,
  };
}

function TestOutlet() {
  return <Outlet context={vehicle} />;
}

function renderTab() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<TestOutlet />}>
          <Route index element={<Documents />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

function rowFor(label: string) {
  return screen.getByRole('cell', { name: label }).closest('tr')!;
}

describe('Documents tab', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-20T00:00:00Z'));
    vi.mocked(useIsAdmin).mockReturnValue(false);
    vi.spyOn(documentsApi, 'fetchVehicleDocuments').mockResolvedValue([]);
    vi.spyOn(documentsApi, 'uploadDocument').mockResolvedValue({} as StoredDocument);
    vi.spyOn(documentsApi, 'removeDocument').mockResolvedValue();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a status badge per document type from expiry columns that exist', async () => {
    renderTab();
    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.getByText('Expiring Soon')).toBeInTheDocument();
    expect(screen.getAllByText('Not Available').length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  });

  it('labels file names from the original spreadsheet as not uploaded', async () => {
    renderTab();
    await waitFor(() => expect(screen.getByText(/Registration_Card_2026\.pdf/)).toBeInTheDocument());
    expect(within(rowFor('Mulkiya')).getByText(/original spreadsheet \(file not uploaded\)/)).toBeInTheDocument();
    expect(screen.getByText('1738002266832_Policy_Certificate.pdf')).toBeInTheDocument();
    expect(screen.getByText('1738002284414_Handbook.pdf')).toBeInTheDocument();
  });

  it('links uploaded files under their document type and shows photos', async () => {
    vi.spyOn(documentsApi, 'fetchVehicleDocuments').mockResolvedValue([
      doc({}),
      doc({ id: 'd2', kind: 'vehicle_photo', file_name: 'front.jpg', url: 'https://signed.example/front' }),
    ]);
    renderTab();

    const link = await within(rowFor('Mulkiya')).findByRole('link', { name: 'Registration Card.pdf' });
    expect(link).toHaveAttribute('href', 'https://signed.example/card');
    expect(within(rowFor('Mulkiya')).getByText('244 KB')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'front.jpg' })).toHaveAttribute('src', 'https://signed.example/front');
  });

  it('shows a Viewer no upload or remove controls', async () => {
    vi.spyOn(documentsApi, 'fetchVehicleDocuments').mockResolvedValue([doc({})]);
    renderTab();
    await screen.findByRole('link', { name: 'Registration Card.pdf' });
    expect(screen.queryByLabelText(/^upload/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('lets an Admin upload a file for a document type and reloads the list', async () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);
    renderTab();
    const input = await screen.findByLabelText('Upload CID Permit');
    const file = new File(['%PDF'], 'permit.pdf', { type: 'application/pdf' });

    await userEvent.upload(input, file);

    expect(documentsApi.uploadDocument).toHaveBeenCalledWith({ vehicleId: 'v1' }, 'cid_permit', file);
    await waitFor(() => expect(documentsApi.fetchVehicleDocuments).toHaveBeenCalledTimes(2));
  });

  it('shows why an upload failed', async () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);
    vi.spyOn(documentsApi, 'uploadDocument').mockRejectedValue(new Error('permit.pdf is larger than 10 MB.'));
    renderTab();

    await userEvent.upload(
      await screen.findByLabelText('Upload CID Permit'),
      new File(['x'], 'permit.pdf', { type: 'application/pdf' })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('permit.pdf is larger than 10 MB.');
  });

  it('removes a file only after the Admin confirms', async () => {
    vi.mocked(useIsAdmin).mockReturnValue(true);
    const uploaded = doc({});
    vi.spyOn(documentsApi, 'fetchVehicleDocuments').mockResolvedValue([uploaded]);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderTab();
    const remove = await within(rowFor('Mulkiya')).findByRole('button', { name: 'Remove' });

    await userEvent.click(remove);
    expect(documentsApi.removeDocument).not.toHaveBeenCalled();

    await userEvent.click(remove);
    expect(confirm).toHaveBeenLastCalledWith('Remove Registration Card.pdf?');
    expect(documentsApi.removeDocument).toHaveBeenCalledWith(uploaded);
  });

  it('uses the configured Expiring Soon threshold', async () => {
    // License expires 2026-10-01: 11 days after the pinned date, so with a
    // 7-day threshold it is Valid rather than Expiring Soon.
    render(
      <SettingsContext.Provider value={{ expiringSoonDays: 7, reload: () => {} }}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<TestOutlet />}>
              <Route index element={<Documents />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </SettingsContext.Provider>
    );
    expect(within(rowFor('Vehicle License')).getByText('Valid')).toBeInTheDocument();
    expect(screen.queryByText('Expiring Soon')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  });
});
