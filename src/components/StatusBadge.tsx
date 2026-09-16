import type { DocumentStatus } from '../lib/documentStatus';

const STYLES: Record<DocumentStatus, string> = {
  valid: 'bg-green-100 text-green-800',
  expiring_soon: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-red-100 text-red-800',
  not_available: 'bg-gray-100 text-gray-600',
};

const LABELS: Record<DocumentStatus, string> = {
  valid: 'Valid',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  not_available: 'Not Available',
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
