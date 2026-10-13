import { fetchExpenseDocuments } from '../api/documents';
import { useDocuments } from '../lib/useDocuments';
import { legacyFileNames } from '../lib/documentFiles';
import { DocumentSlot } from './DocumentSlot';
import { LoadError } from './LoadError';
import type { DocumentKind, Expense } from '../types';

const SLOTS: { label: string; kind: DocumentKind; legacy: (e: Expense) => string | null }[] = [
  { label: 'Quotation', kind: 'quotation', legacy: (e) => e.quotation_file },
  { label: 'Invoice', kind: 'invoice', legacy: (e) => e.invoice_file },
  { label: 'Other attachments', kind: 'other', legacy: (e) => e.other_attachments },
];

/** Attachments for a saved expense; shown on the Edit Expense page (Admins only). */
export function ExpenseAttachments({ expense }: { expense: Expense }) {
  const { loadError, actionError, ofKind, upload, remove } = useDocuments({ expenseId: expense.id }, () =>
    fetchExpenseDocuments([expense.id])
  );

  return (
    <fieldset className="mb-6">
      <legend className="text-lg font-semibold text-oryx-blue mb-3">Attachments</legend>
      {loadError && <LoadError what="attachments" message={loadError} />}
      {actionError && (
        <p role="alert" className="text-red-700 text-sm mb-3">
          {actionError}
        </p>
      )}
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm">
        {SLOTS.map((slot) => (
          <div key={slot.kind}>
            <dt className="text-oryx-silver">{slot.label}</dt>
            <dd>
              <DocumentSlot
                label={slot.label}
                documents={loadError ? [] : ofKind(slot.kind)}
                legacyNames={legacyFileNames(slot.legacy(expense))}
                canEdit
                onUpload={(file) => upload(slot.kind, file)}
                onRemove={remove}
              />
            </dd>
          </div>
        ))}
      </dl>
    </fieldset>
  );
}
