import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Finance } from '../Finance';
import type { Vehicle } from '../../../types';

const financedVehicle: Vehicle = {
  monthly_repayment: 2500, finance_amount: 90000, start_date_of_instalments: '2024-10-30',
  end_date_of_instalments: '2027-10-30', emi_status: 'Active',
} as Vehicle;

const unfinancedVehicle: Vehicle = {
  monthly_repayment: null, finance_amount: null, start_date_of_instalments: null,
  end_date_of_instalments: null, emi_status: null,
} as Vehicle;

function renderFinance(vehicle: Vehicle) {
  function TestOutlet() {
    return <Outlet context={vehicle} />;
  }
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<TestOutlet />}>
          <Route index element={<Finance />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('Finance tab', () => {
  it('shows finance figures when present', () => {
    renderFinance(financedVehicle);
    expect(screen.getByText('AED 2,500')).toBeInTheDocument();
    expect(screen.getByText('AED 90,000')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows Not Available when finance fields are empty, never invents figures', () => {
    renderFinance(unfinancedVehicle);
    expect(screen.getAllByText('Not Available').length).toBeGreaterThan(0);
    expect(screen.queryByText('AED 0')).not.toBeInTheDocument();
  });
});
