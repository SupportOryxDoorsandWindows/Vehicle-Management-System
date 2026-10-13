import { useState } from 'react';
import { errorMessage } from '../lib/useLoad';

interface DeleteButtonProps {
  /** e.g. "Delete vehicle" */
  label: string;
  /** What will happen, shown when asking for confirmation. */
  confirmMessage: string;
  onDelete: () => Promise<void>;
  /** Turns a failure into a message; defaults to the error's own message. */
  describeError?: (err: unknown) => string;
}

/** Asks for confirmation in place before deleting. */
export function DeleteButton({ label, confirmMessage, onDelete, describeError = errorMessage }: DeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(describeError(err));
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div className="mt-8 pt-4 border-t border-oryx-silver">
      {confirming ? (
        <div role="group" aria-label={label}>
          <p className="text-sm mb-3">{confirmMessage}</p>
          <div className="flex gap-4 items-center">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={deleting}
              className="bg-red-700 text-white rounded px-4 py-2 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Yes, delete'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="text-oryx-blue underline"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          className="border border-red-700 text-red-700 rounded px-4 py-2"
        >
          {label}
        </button>
      )}
      {error && (
        <p role="alert" className="text-red-700 text-sm mt-3">
          {error}
        </p>
      )}
    </div>
  );
}
