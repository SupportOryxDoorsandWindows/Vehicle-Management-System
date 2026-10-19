import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Vehicles, PAGE_SIZE } from '../Vehicles';
import * as vehiclesApi from '../../api/vehicles';
import * as expensesApi from '../../api/expenses';
import * as driverPhotosApi from '../../api/driverPhotos';
import * as exportExcel from '../../lib/exportExcel';
import type { Vehicle, Expense } from '../../types';

vi.mock('../../lib/useIsAdmin', () => ({ useIsAdmin: vi.fn(() => false) }));

const vehicles: Vehicle[] = [
  { id: 'v1', plate_no: 'U 67931', brand: 'Ford', model: 'Ranger 2021', driver: 'Ronald', department: 'Installation', vehicle_condition: 'Good', status: 'active', vehicle_license_expiry_date: '2027-03-01' } as Vehicle,
  { id: 'v2', plate_no: 'CC 16257', brand: 'Toyota', model: 'Prado 2022', driver: 'Mark', department: 'Installation', vehicle_condition: 'Good', status: 'active', vehicle_license_expiry_date: '2026-10-28', chassis_no: 'JTEBR3FJ' } as Vehicle,
  { id: 'v3', plate_no: 'E 97818', brand: 'Suzuki', model: 'Grand Vitara', driver: 'Hesbon', department: 'Logistics', vehicle_condition: 'Good', status: 'active', vehicle_license_expiry_date: '2026-10-17' } as Vehicle,
  { id: 'v4', plate_no: 'K 13797', brand: 'Toyota', model: 'Hiace', driver: null, department: 'Sales', vehicle_condition: 'Excellent', status: 'inactive', vehicle_license_expiry_date: null } as Vehicle,
];
const expenses: Expense[] = [
  { id: 'e1', vehicle_id: 'v1', cost: 1000 } as Expense,
  { id: 'e2', vehicle_id: 'v4', cost: 3000 } as Expense,
];

function renderPage(path = '/vehicles') {
  render(<MemoryRouter initialEntries={[path]}><Vehicles /></MemoryRouter>);
}
const cardTitles = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-14T00:00:00Z'));
  vi.spyOn(vehiclesApi, 'fetchVehicles').mockResolvedValue(vehicles);
  vi.spyOn(expensesApi, 'fetchAllExpenses').mockResolvedValue(expenses);
  vi.spyOn(driverPhotosApi, 'fetchDriverPhotoUrls').mockResolvedValue(new Map([['ronald', 'https://signed/ronald']]));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Vehicles page', () => {
  it('renders a photo card per vehicle with its total expenses and driver', async () => {
    renderPage();
    const card = (await screen.findByRole('heading', { name: 'Ford Ranger 2021' })).closest('a') as HTMLElement;
    expect(card).toHaveAttribute('href', '/vehicles/v1');
    expect(within(card).getByText('AED 1,000')).toBeInTheDocument();
    expect(within(card).getByText('U 67931')).toBeInTheDocument();
    expect(within(card).getByRole('img', { name: 'Ronald' })).toHaveAttribute('src', 'https://signed/ronald');
    expect(within(card).getByText('1 Mar 2027')).toBeInTheDocument();
    expect(screen.getByText('4 vehicles · 2 need attention')).toBeInTheDocument();
  });

  it("shows the driver's initials without a photo, and Not Assigned without a driver", async () => {
    renderPage();
    const prado = (await screen.findByRole('heading', { name: 'Toyota Prado 2022' })).closest('a') as HTMLElement;
    expect(within(prado).getByText('Mark')).toBeInTheDocument();
    const hiace = screen.getByRole('heading', { name: 'Toyota Hiace' }).closest('a') as HTMLElement;
    expect(within(hiace).getByText('Not Assigned')).toBeInTheDocument();
  });

  it('puts the vehicles that need attention first, the most urgent licence first', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Ford Ranger 2021' });
    expect(cardTitles()).toEqual(['Suzuki Grand Vitara', 'Toyota Prado 2022', 'Ford Ranger 2021', 'Toyota Hiace']);
    expect(screen.getByText('Licence expires in 3 days')).toBeInTheDocument();
    expect(screen.getByText('Licence due soon')).toBeInTheDocument();
    const hiace = screen.getByRole('heading', { name: 'Toyota Hiace' }).closest('a') as HTMLElement;
    expect(within(hiace).getByText('Inactive')).toBeInTheDocument();
  });

  it('sorts by highest spend or by plate', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Ford Ranger 2021' });
    await userEvent.selectOptions(screen.getByLabelText('Sort'), 'Highest spend');
    expect(cardTitles().slice(0, 2)).toEqual(['Toyota Hiace', 'Ford Ranger 2021']);
    await userEvent.selectOptions(screen.getByLabelText('Sort'), 'Plate');
    expect(cardTitles()).toEqual(['Toyota Prado 2022', 'Suzuki Grand Vitara', 'Toyota Hiace', 'Ford Ranger 2021']);
  });

  it('opens sorted by spend from the dashboard link', async () => {
    renderPage('/vehicles?sort=spend');
    await screen.findByRole('heading', { name: 'Ford Ranger 2021' });
    expect(screen.getByLabelText('Sort')).toHaveValue('spend');
  });

  it('searches plate, model, driver, department and chassis', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Ford Ranger 2021' });
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search vehicles' }), 'jtebr');
    expect(cardTitles()).toEqual(['Toyota Prado 2022']);
  });

  it('starts with the search from the dashboard', async () => {
    renderPage('/vehicles?q=Hesbon');
    await screen.findByRole('heading', { name: 'Suzuki Grand Vitara' });
    expect(cardTitles()).toEqual(['Suzuki Grand Vitara']);
  });

  it('filters by department chip, and again to clear it', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Ford Ranger 2021' });
    const group = screen.getByRole('group', { name: 'Department' });
    expect(within(group).getByRole('button', { name: 'All · 4' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(within(group).getByRole('button', { name: 'Installation · 2' }));
    expect(cardTitles()).toEqual(['Toyota Prado 2022', 'Ford Ranger 2021']);
    await userEvent.click(within(group).getByRole('button', { name: 'Installation · 2' }));
    expect(cardTitles()).toHaveLength(4);
  });

  it('shows the three biggest departments, and the rest on request', async () => {
    vi.spyOn(vehiclesApi, 'fetchVehicles').mockResolvedValue([
      ...vehicles,
      { ...vehicles[0], id: 'v5', plate_no: 'A 1', department: 'Marketing' },
    ]);
    renderPage();
    await screen.findByRole('heading', { name: 'Toyota Hiace' });
    const group = screen.getByRole('group', { name: 'Department' });
    expect(within(group).queryByRole('button', { name: /^Sales/ })).not.toBeInTheDocument();
    await userEvent.click(within(group).getByRole('button', { name: '1 more' }));
    expect(within(group).getByRole('button', { name: 'Sales · 1' })).toBeInTheDocument();
  });

  it('filters by status', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Ford Ranger 2021' });
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'inactive');
    expect(cardTitles()).toEqual(['Toyota Hiace']);
  });

  it('switches to a table of the same vehicles', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Ford Ranger 2021' });
    await userEvent.click(screen.getByRole('button', { name: 'Table' }));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(5);
    expect(within(table).getByRole('link', { name: 'U 67931' })).toHaveAttribute('href', '/vehicles/v1');
  });

  it(`shows ${PAGE_SIZE} vehicles at a time`, async () => {
    const many = Array.from({ length: PAGE_SIZE + 5 }, (_, i) => ({ ...vehicles[0], id: `m${i}`, plate_no: `A ${i}`, model: `Model ${i}` }));
    vi.spyOn(vehiclesApi, 'fetchVehicles').mockResolvedValue(many);
    renderPage();
    expect(await screen.findByText(`Showing ${PAGE_SIZE} of ${PAGE_SIZE + 5}`)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(screen.getByText(`Showing ${PAGE_SIZE + 5} of ${PAGE_SIZE + 5}`)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('still lists vehicles when driver photos fail to load', async () => {
    vi.spyOn(driverPhotosApi, 'fetchDriverPhotoUrls').mockRejectedValue(new Error('storage down'));
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Ford Ranger 2021' })).toBeInTheDocument();
  });

  it('exports exactly the vehicles currently shown', async () => {
    const download = vi.spyOn(exportExcel, 'downloadWorkbook').mockResolvedValue();
    renderPage();
    await screen.findByRole('heading', { name: 'Ford Ranger 2021' });
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search vehicles' }), 'Prado');

    await userEvent.click(screen.getByRole('button', { name: 'Export to Excel' }));

    const [fileName, sheets] = download.mock.calls[0];
    expect(fileName).toMatch(/^vehicles-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(sheets[0].rows.map((r) => r[0])).toEqual(['CC 16257']);
  });

  it('shows why an export failed', async () => {
    vi.spyOn(exportExcel, 'downloadWorkbook').mockRejectedValue(new Error('Blob not supported'));
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Export to Excel' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Export failed: Blob not supported');
  });
});
