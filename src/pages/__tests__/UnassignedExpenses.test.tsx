import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UnassignedExpenses } from '../UnassignedExpenses';
import * as expensesApi from '../../api/expenses';
import type { Expense } from '../../types';

const expenses: Expense[] = [
  { id: 'e1', vehicle_id: null, date: '2026-09-08', expense: 'Staff Uniform', supplier_name: 'Walkahead', cost: 5286.75, raw_vehicle_number_text: null } as Expense,
];

beforeEach(() => {
  vi.spyOn(expensesApi, 'fetchUnassignedExpenses').mockResolvedValue(expenses);
});

describe('UnassignedExpenses page', () => {
  it('lists unassigned expenses with a Vehicle Not Assigned label', async () => {
    render(<UnassignedExpenses />);
    await waitFor(() => expect(screen.getByText('Staff Uniform')).toBeInTheDocument());
    expect(screen.getByText('Vehicle Not Assigned')).toBeInTheDocument();
  });
});
