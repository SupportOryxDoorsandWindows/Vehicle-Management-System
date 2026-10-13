import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createExpense, deleteExpense, fetchExpenseById, updateExpense, type ExpenseInput } from '../api/expenses';
import { fetchVehicles } from '../api/vehicles';
import { deriveSystemCategory } from '../../scripts/import/categorize';
import { RecordForm } from '../components/RecordForm';
import { LoadError } from '../components/LoadError';
import { DeleteButton } from '../components/DeleteButton';
import { ExpenseAttachments } from '../components/ExpenseAttachments';
import { fromFormValues, toFormValues, type FieldErrors } from '../lib/recordForm';
import { expenseFieldGroups } from '../lib/expenseFields';
import { errorMessage, useLoad } from '../lib/useLoad';
import type { Expense, Vehicle } from '../types';

function listPathFor(vehicleId: string | null | undefined): string {
  return vehicleId ? `/vehicles/${vehicleId}/expenses` : '/unassigned-expenses';
}

/** /expenses/new (optionally ?vehicle=<id>) and /expenses/:id/edit */
export function ExpenseForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const presetVehicleId = searchParams.get('vehicle') ?? '';
  const { data, error } = useLoad(
    () => Promise.all([fetchVehicles(), id ? fetchExpenseById(id) : Promise.resolve(null)]),
    [id]
  );

  if (error) return <LoadError what="this expense" message={error} />;
  if (!data) return <p>Loading...</p>;
  const [vehicles, expense] = data;
  if (id && expense === null) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-oryx-blue mb-2">Expense not found</h1>
        <Link to="/unassigned-expenses" className="text-oryx-blue underline">
          Back to Unassigned Expenses
        </Link>
      </div>
    );
  }
  return (
    <ExpenseEditor
      key={id ?? 'new'}
      expense={expense}
      vehicles={vehicles}
      presetVehicleId={presetVehicleId}
    />
  );
}

function ExpenseEditor({
  expense,
  vehicles,
  presetVehicleId,
}: {
  expense: Expense | null;
  vehicles: Vehicle[];
  presetVehicleId: string;
}) {
  const navigate = useNavigate();
  const groups = useMemo(() => expenseFieldGroups(vehicles), [vehicles]);
  const [values, setValues] = useState(() =>
    toFormValues(expense ?? { vehicle_id: presetVehicleId, system_category: 'other' }, groups)
  );
  // A new expense's category follows what's typed until the Admin picks one.
  const [categoryChosen, setCategoryChosen] = useState(expense !== null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const cancelTo = listPathFor(expense ? expense.vehicle_id : presetVehicleId);

  function handleChange(name: string, value: string) {
    if (name === 'system_category') setCategoryChosen(true);
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      if (!categoryChosen && (name === 'type_of_expense' || name === 'expense')) {
        next.system_category = deriveSystemCategory(next.type_of_expense, next.expense);
      }
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { data, errors } = fromFormValues(values, groups);
    setErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const input = data as ExpenseInput;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = expense ? await updateExpense(expense.id, input) : await createExpense(input);
      navigate(listPathFor(saved.vehicle_id));
    } catch (err) {
      setSaveError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-4xl">
      <h1 className="text-2xl font-bold text-oryx-blue mb-4">{expense ? 'Edit Expense' : 'Add Expense'}</h1>
      <RecordForm groups={groups} values={values} errors={errors} onChange={handleChange} />
      {expense ? (
        <ExpenseAttachments expense={expense} />
      ) : (
        <p className="text-sm text-oryx-silver mb-6">You can attach a quotation or invoice once the expense is saved.</p>
      )}
      {saveError && (
        <p role="alert" className="text-red-700 text-sm mb-4">
          {saveError}
        </p>
      )}
      <div className="flex gap-4 items-center">
        <button
          type="submit"
          disabled={saving}
          className="bg-oryx-blue text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {saving ? 'Saving...' : expense ? 'Save changes' : 'Add expense'}
        </button>
        <Link to={cancelTo} className="text-oryx-blue underline">
          Cancel
        </Link>
      </div>
      {expense && (
        <DeleteButton
          label="Delete expense"
          confirmMessage={`Delete ${expense.expense ? `"${expense.expense}"` : 'this expense'}? Its attachments are deleted with it. Its assignment history is kept.`}
          onDelete={async () => {
            await deleteExpense(expense.id);
            navigate(listPathFor(expense.vehicle_id));
          }}
        />
      )}
    </form>
  );
}
