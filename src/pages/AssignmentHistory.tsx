import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchAssignmentHistory,
  fetchDeletedRecords,
  HISTORY_LIMIT,
  type AssignmentHistoryEntry,
} from '../api/history';
import { fetchProfiles } from '../api/profiles';
import { fetchVehicles } from '../api/vehicles';
import { LoadError } from '../components/LoadError';
import { ExportButton } from '../components/ExportButtons';
import { buildSheet, exportFileName } from '../lib/exportExcel';
import { formatAED } from '../lib/format';
import { useLoad } from '../lib/useLoad';
import { serviceKindLabel } from '../lib/serviceLog';
import type { DeletedRecord, ServiceKind } from '../types';

const NO_ENTRIES: AssignmentHistoryEntry[] = [];
const NO_DELETIONS: DeletedRecord[] = [];

function whoLabel(assignedBy: string | null, emailById: Map<string, string>): string {
  if (assignedBy === 'system' || assignedBy === null) return 'System';
  return emailById.get(assignedBy) ?? 'Unknown user';
}

/** e.g. "Vehicle DD 18410", "Expense: Oil change (AED 350)", "Service record: Service on 2026-09-01". */
function deletedLabel(d: DeletedRecord, plateById: Map<string, string>): string {
  const r = d.record as Record<string, string | number | null>;
  if (d.table_name === 'vehicles') return `Vehicle ${r.plate_no}`;
  const plate = r.vehicle_id ? plateById.get(String(r.vehicle_id)) : null;
  const on = plate ? `, ${plate}` : '';
  if (d.table_name === 'expenses') {
    const cost = r.cost != null ? ` (${formatAED(Number(r.cost))})` : '';
    return `Expense: ${r.expense ?? 'Unnamed expense'}${cost}${on}`;
  }
  return `Service record: ${serviceKindLabel(r.kind as ServiceKind)} on ${r.record_date}${on}`;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export function AssignmentHistory() {
  const { data, error } = useLoad(
    () => Promise.all([fetchAssignmentHistory(), fetchProfiles(), fetchDeletedRecords(), fetchVehicles()]),
    []
  );
  const entries = data?.[0] ?? NO_ENTRIES;
  const deletions = data?.[2] ?? NO_DELETIONS;
  const [vehicleId, setVehicleId] = useState('');

  const emailById = useMemo(() => new Map((data?.[1] ?? []).map((p) => [p.id, p.email])), [data]);

  const vehicles = useMemo(() => {
    const byId = new Map<string, string>();
    for (const e of entries) {
      if (e.previous) byId.set(e.previous.id, e.previous.plate_no);
      if (e.assigned) byId.set(e.assigned.id, e.assigned.plate_no);
    }
    return [...byId].sort((a, b) => a[1].localeCompare(b[1]));
  }, [entries]);

  // Includes deleted vehicles, so a deleted expense or service record can still say which vehicle it was on.
  const plateById = useMemo(() => {
    const byId = new Map((data?.[3] ?? []).map((v) => [v.id, v.plate_no]));
    for (const d of deletions) {
      if (d.table_name === 'vehicles') byId.set(d.record_id, String(d.record.plate_no));
    }
    return byId;
  }, [data, deletions]);

  const shown = vehicleId
    ? entries.filter((e) => e.previous?.id === vehicleId || e.assigned?.id === vehicleId)
    : entries;

  if (error) return <LoadError what="assignment history" message={error} />;
  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-oryx-blue">Assignment History</h1>
        <ExportButton
          fileName={exportFileName('assignment history')}
          sheets={() => [
            buildSheet(
              'Assignment History',
              [
                { header: 'When', value: (e) => formatWhen(e.assigned_at), width: 22 },
                { header: 'Expense', value: (e) => e.expense?.expense, width: 28 },
                { header: 'Expense Date', kind: 'date', value: (e) => e.expense?.date },
                { header: 'Amount (AED)', kind: 'money', value: (e) => e.expense?.cost },
                { header: 'From', value: (e) => e.previous?.plate_no ?? 'Not assigned', width: 14 },
                { header: 'To', value: (e) => e.assigned?.plate_no ?? 'Not assigned', width: 14 },
                { header: 'By', value: (e) => whoLabel(e.assigned_by, emailById), width: 28 },
              ],
              shown
            ),
            buildSheet(
              'Deleted Records',
              [
                { header: 'When', value: (d) => formatWhen(d.deleted_at), width: 22 },
                { header: 'Record', value: (d) => deletedLabel(d, plateById), width: 50 },
                { header: 'By', value: (d) => whoLabel(d.deleted_by, emailById), width: 28 },
              ],
              deletions
            ),
          ]}
        />
      </div>
      <p className="text-sm text-oryx-silver mb-4">
        Every time an expense is assigned to a vehicle, moved, or unassigned, the database records it here.
      </p>
      <label className="text-sm block mb-4 print:hidden">
        Vehicle{' '}
        <select
          aria-label="Vehicle"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          className="border border-oryx-silver rounded px-2 py-1"
        >
          <option value="">All</option>
          {vehicles.map(([id, plate]) => (
            <option key={id} value={id}>
              {plate}
            </option>
          ))}
        </select>
      </label>
      {entries.length >= HISTORY_LIMIT && (
        <p className="text-sm text-oryx-silver mb-2">Showing the latest {HISTORY_LIMIT} changes.</p>
      )}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-oryx-silver">
            <th className="py-2">When</th>
            <th>Expense</th>
            <th>Amount</th>
            <th>From</th>
            <th>To</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((e) => (
            <tr key={e.id} className="border-b border-oryx-silver">
              <td className="py-2">{formatWhen(e.assigned_at)}</td>
              <td>
                {e.expense ? (
                  <Link to={`/expenses/${e.expense.id}/edit`} className="text-oryx-blue underline">
                    {e.expense.expense ?? 'Unnamed expense'}
                  </Link>
                ) : (
                  'Deleted expense'
                )}
              </td>
              <td>{formatAED(e.expense?.cost ?? null)}</td>
              <td>{e.previous ? <VehicleLink {...e.previous} /> : 'Not assigned'}</td>
              <td>{e.assigned ? <VehicleLink {...e.assigned} /> : 'Not assigned'}</td>
              <td>{whoLabel(e.assigned_by, emailById)}</td>
            </tr>
          ))}
          {shown.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-oryx-silver">
                No assignment changes recorded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 className="text-lg font-semibold text-oryx-blue mt-8 mb-2">Deleted Records</h2>
      <p className="text-sm text-oryx-silver mb-4">
        The database keeps a full copy of every deleted vehicle, expense and service record, so a
        mistaken delete can be restored on request.
      </p>
      {deletions.length >= HISTORY_LIMIT && (
        <p className="text-sm text-oryx-silver mb-2">Showing the latest {HISTORY_LIMIT} deletions.</p>
      )}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-oryx-silver">
            <th className="py-2">When</th>
            <th>Record</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {deletions.map((d) => (
            <tr key={d.id} className="border-b border-oryx-silver">
              <td className="py-2">{formatWhen(d.deleted_at)}</td>
              <td>{deletedLabel(d, plateById)}</td>
              <td>{whoLabel(d.deleted_by, emailById)}</td>
            </tr>
          ))}
          {deletions.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-oryx-silver">
                Nothing has been deleted.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function VehicleLink({ id, plate_no }: { id: string; plate_no: string }) {
  return (
    <Link to={`/vehicles/${id}`} className="text-oryx-blue underline">
      {plate_no}
    </Link>
  );
}
