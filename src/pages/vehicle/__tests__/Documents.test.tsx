import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Documents } from '../Documents';
import type { Vehicle } from '../../../types';

const vehicle: Vehicle = {
  vehicle_license_expiry_date: '2026-10-01', // expiring soon relative to the pinned system time below
  cid_permit_expiry: '2020-01-01', // expired
  advertisement_permit_expiry: null, // not available
  upload_mulkiya: '1762756090175537_Registration_Card_2026.pdf',
} as Vehicle;

function TestOutlet() {
  return <Outlet context={vehicle} />;
}

describe('Documents tab', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-20T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a status badge per document type from expiry columns that exist', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestOutlet />}>
            <Route index element={<Documents />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.getAllByText('Not Available').length).toBeGreaterThan(0);
    expect(screen.getByText(/Registration_Card_2026\.pdf/)).toBeInTheDocument();
  });
});
