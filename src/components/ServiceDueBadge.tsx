import type { ServiceDueStatus } from '../lib/serviceLog';

const STYLES: Record<ServiceDueStatus, string> = {
  ok: 'bg-green-100 text-green-800',
  due_soon: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
};

const LABELS: Record<ServiceDueStatus, string> = {
  ok: 'Not Due',
  due_soon: 'Due Soon',
  overdue: 'Overdue',
};

export function ServiceDueBadge({ status }: { status: ServiceDueStatus }) {
  return <span className={`px-2 py-1 rounded text-xs font-semibold ${STYLES[status]}`}>{LABELS[status]}</span>;
}
