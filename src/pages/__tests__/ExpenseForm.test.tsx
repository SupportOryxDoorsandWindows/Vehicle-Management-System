import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ExpenseForm } from '../ExpenseForm';
import * as expensesApi from '../../api/expenses';
import * as vehiclesApi from '../../api/vehicles';
import * as documentsApi from '../../api/documents';
import type { Expense, Vehicle } from '../../types';

const vehicles = [
  { id: 'v1', plate_no: 'U 67931', brand: 'Ford', model: 'Ranger 2021' },
  { id: 'v2', plate_no: 'CC 16257', brand: 'Toyota', model: 'Prado 2022' },
] as Vehicle[];

const existing = {
  id: 'e1',
  vehicle_id: null,
  expense: 'Staff Uniform',
  cost: 5286.75,
  system_category: 'other',
} as Expense;

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/expenses/new" element={<ExpenseForm />} />
        <Route path="/expenses/:id/edit" element={<ExpenseForm />} />
        <Route path="/vehicles/:id/expenses" element={<p>Vehicle expenses page</p>} />
        <Route path="/unassigned-expenses" element={<p>Unassigned page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.spyOn(vehiclesApi, 'fetchVehicles').mockResolvedValue(vehicles);
  vi.spyOn(documentsApi, 'fetchExpenseDocuments').mockResolvedValue([]);
  vi.spyOn(expensesApi, 'fetchExpenseById').mockResolvedValue(existing);
  vi.spyOn(expensesApi, 'createExpense').mockImplementation(
    async (input) => ({ ...input, id: 'new' }) as Expense
  );
  vi.spyOn(expensesApi, 'updateExpense').mockImplementation(
    async (id, input) => ({ ...existing, ...input, id }) as Expense
  );
});

describe('ExpenseForm', () => {
  it('presets the vehicle from ?vehicle= and returns to that vehicle after saving', async () => {
    renderAt('/expenses/new?vehicle=v2');
    expect(await screen.findByLabelText(/^vehicle/i)).toHaveValue('v2');

    await userEvent.type(screen.getByLabelText(/^expense$/i), 'Oil change');
    await userEvent.type(screen.getByLabelText(/cost/i), '350');
    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(await screen.findByText('Vehicle expenses page')).toBeInTheDocument();
    expect(expensesApi.createExpense).toHaveBeenCalledWith(
      expect.objectContaining({ vehicle_id: 'v2', expense: 'Oil change', cost: 350 })
    );
  });

  it('suggests a category from what is typed until the Admin picks one', async () => {
    renderAt('/expenses/new');
    const category = await screen.findByLabelText(/category/i);
    expect(category).toHaveValue('other');

    await userEvent.type(screen.getByLabelText(/^expense$/i), 'Diesel top-up');
    expect(category).toHaveValue('fuel');

    await userEvent.selectOptions(category, 'repairs');
    await userEvent.type(screen.getByLabelText(/type of expense/i), 'Insurance');
    expect(category).toHaveValue('repairs');
  });

  it('assigns an existing unassigned expense via the vehicle field', async () => {
    renderAt('/expenses/e1/edit');
    const vehicle = await screen.findByLabelText(/^vehicle/i);
    expect(vehicle).toHaveValue('');
    expect(screen.getByLabelText(/category/i)).toHaveValue('other');

    await userEvent.selectOptions(vehicle, 'v1');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Vehicle expenses page')).toBeInTheDocument();
    expect(expensesApi.updateExpense).toHaveBeenCalledWith('e1', expect.objectContaining({ vehicle_id: 'v1' }));
  });

  it('rejects a negative cost without saving', async () => {
    renderAt('/expenses/new');
    await userEvent.type(await screen.findByLabelText(/cost/i), '-20');
    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(screen.getByText("Cost (AED) can't be less than 0.")).toBeInTheDocument();
    expect(expensesApi.createExpense).not.toHaveBeenCalled();
  });

  it('keeps the form and shows the error when saving fails', async () => {
    vi.spyOn(expensesApi, 'updateExpense').mockRejectedValue(new Error('permission denied'));
    renderAt('/expenses/e1/edit');
    await userEvent.click(await screen.findByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('permission denied');
    expect(screen.getByLabelText(/^expense$/i)).toHaveValue('Staff Uniform');
  });

  it('offers attachments only once the expense exists', async () => {
    renderAt('/expenses/new');
    expect(await screen.findByText(/attach a quotation or invoice once the expense is saved/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Upload Invoice')).not.toBeInTheDocument();
  });

  it('lets an Admin attach an invoice to an existing expense', async () => {
    const upload = vi.spyOn(documentsApi, 'uploadDocument').mockResolvedValue({} as never);
    renderAt('/expenses/e1/edit');
    const file = new File(['%PDF'], 'invoice.pdf', { type: 'application/pdf' });

    await userEvent.upload(await screen.findByLabelText('Upload Invoice'), file);

    expect(upload).toHaveBeenCalledWith({ expenseId: 'e1' }, 'invoice', file);
    expect(documentsApi.fetchExpenseDocuments).toHaveBeenCalledWith(['e1']);
  });

  it('deletes an expense after confirming and returns to its list', async () => {
    const remove = vi.spyOn(expensesApi, 'deleteExpense').mockResolvedValue();
    renderAt('/expenses/e1/edit');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete expense' }));
    expect(screen.getByText(/Delete "Staff Uniform"\? Its attachments are deleted with it/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));

    expect(await screen.findByText('Unassigned page')).toBeInTheDocument();
    expect(remove).toHaveBeenCalledWith('e1');
  });

  it('keeps the expense and shows the error when deleting fails', async () => {
    vi.spyOn(expensesApi, 'deleteExpense').mockRejectedValue(new Error('permission denied'));
    renderAt('/expenses/e1/edit');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete expense' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('permission denied');
    expect(screen.getByRole('button', { name: 'Delete expense' })).toBeInTheDocument();
  });
});
