import { useState } from 'react';
import { downloadWorkbook, type ExportSheet } from '../lib/exportExcel';
import { errorMessage } from '../lib/useLoad';

/** Builds the sheets at click time, so the export matches what's on screen right now. */
export function ExportButton({ fileName, sheets }: { fileName: string; sheets: () => ExportSheet[] }) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="print:hidden inline-flex items-center gap-2">
      <button
        type="button"
        disabled={exporting}
        onClick={async () => {
          setExporting(true);
          setError(null);
          try {
            await downloadWorkbook(fileName, sheets());
          } catch (err) {
            setError(`Export failed: ${errorMessage(err)}`);
          }
          setExporting(false);
        }}
        className="border border-oryx-silver rounded px-3 py-1 text-sm disabled:opacity-50"
      >
        {exporting ? 'Exporting...' : 'Export to Excel'}
      </button>
      {error && (
        <span role="alert" className="text-red-700 text-sm">
          {error}
        </span>
      )}
    </span>
  );
}

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden border border-oryx-silver rounded px-3 py-1 text-sm"
    >
      Print / Save as PDF
    </button>
  );
}
