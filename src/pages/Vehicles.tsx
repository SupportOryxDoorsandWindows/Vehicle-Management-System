import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchVehicles } from '../api/vehicles';
import { fetchAllExpenses } from '../api/expenses';
import { driverKey, fetchDriverPhotoUrls } from '../api/driverPhotos';
import { VehicleCard } from '../components/VehicleCard';
import { PlateChip } from '../components/PlateChip';
import { TonePill } from '../components/TonePill';
import { formatAED, formatDate } from '../lib/format';
import { LoadError } from '../components/LoadError';
import { useLoad } from '../lib/useLoad';
import { useIsAdmin } from '../lib/useIsAdmin';
import { useSettings } from '../lib/useSettings';
import { needsAttention, vehicleAttention, type VehicleAttention } from '../lib/vehicleAttention';
import { ExportButton } from '../components/ExportButtons';
import { BUTTON_PRIMARY } from '../components/ui';
import { exportFileName } from '../lib/exportExcel';
import { vehicleRegisterSheet } from '../lib/exportSheets';
import type { Vehicle, Expense } from '../types';

const NO_VEHICLES: Vehicle[] = [];
const NO_EXPENSES: Expense[] = [];
const NO_PHOTOS = new Map<string, string>();
/** Cards shown before "Show more". */
export const PAGE_SIZE = 24;
/** Department chips shown before "N more". */
const TOP_DEPARTMENTS = 3;

type Sort = 'attention' | 'spend' | 'plate';
const SORTS: { value: Sort; label: string }[] = [
  { value: 'attention', label: 'Needs attention first' },
  { value: 'spend', label: 'Highest spend' },
  { value: 'plate', label: 'Plate' },
];

const CHIP = 'h-9 px-3 rounded-full border text-[13px]';
const CHIP_ON = `${CHIP} border-oryx-blue bg-oryx-blue text-white`;
const CHIP_OFF = `${CHIP} border-oryx-field bg-white text-oryx-ink hover:bg-oryx-soft`;
const SELECT = 'h-9 rounded-lg border border-oryx-field bg-white text-oryx-ink px-2';

export function Vehicles() {
  const { data, error } = useLoad(
    () =>
      Promise.all([
        fetchVehicles(),
        fetchAllExpenses(),
        // Photos are decoration: without them, cards show initials.
        fetchDriverPhotoUrls().catch(() => NO_PHOTOS),
      ]),
    []
  );
  const [vehicles, expenses, driverPhotos] = data ?? [NO_VEHICLES, NO_EXPENSES, NO_PHOTOS];
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [department, setDepartment] = useState('');
  const [showAllDepartments, setShowAllDepartments] = useState(false);
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<Sort>(
    SORTS.some((s) => s.value === searchParams.get('sort')) ? (searchParams.get('sort') as Sort) : 'attention'
  );
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const isAdmin = useIsAdmin();
  const { expiringSoonDays } = useSettings();

  const totalsByVehicle = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenses) {
      if (!e.vehicle_id || e.cost == null) continue;
      totals.set(e.vehicle_id, (totals.get(e.vehicle_id) ?? 0) + e.cost);
    }
    return totals;
  }, [expenses]);

  const attentionById = useMemo(() => {
    const asOf = new Date();
    return new Map(vehicles.map((v) => [v.id, vehicleAttention(v, asOf, expiringSoonDays)]));
  }, [vehicles, expiringSoonDays]);

  const departments = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of vehicles) if (v.department) counts.set(v.department, (counts.get(v.department) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [vehicles]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = vehicles.filter((v) => {
      if (department && v.department !== department) return false;
      if (status && v.status !== status) return false;
      if (!query) return true;
      return [v.plate_no, v.brand, v.model, v.driver, v.department, v.chassis_no]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query));
    });
    const attention = (v: Vehicle) => attentionById.get(v.id) as VehicleAttention;
    const byPlate = (a: Vehicle, b: Vehicle) => a.plate_no.localeCompare(b.plate_no);
    const bySpend = (a: Vehicle, b: Vehicle) => (totalsByVehicle.get(b.id) ?? 0) - (totalsByVehicle.get(a.id) ?? 0);
    return rows.sort((a, b) => {
      if (sort === 'plate') return byPlate(a, b);
      if (sort === 'spend') return bySpend(a, b) || byPlate(a, b);
      const [x, y] = [attention(a), attention(b)];
      if (x.rank !== y.rank) return y.rank - x.rank;
      // Among those needing attention, the soonest licence first.
      if (needsAttention(x) && x.daysLeft !== y.daysLeft) return (x.daysLeft ?? 0) - (y.daysLeft ?? 0);
      return bySpend(a, b) || byPlate(a, b);
    });
  }, [vehicles, search, department, status, sort, attentionById, totalsByVehicle]);

  if (error) return <LoadError what="vehicles" message={error} />;
  if (!data) return <p>Loading...</p>;

  const attentionCount = vehicles.filter((v) => needsAttention(attentionById.get(v.id) as VehicleAttention)).length;
  const shownDepartments = showAllDepartments ? departments : departments.slice(0, TOP_DEPARTMENTS);
  const hiddenDepartments = departments.length - TOP_DEPARTMENTS;
  const shown = filtered.slice(0, limit);
  const photoFor = (v: Vehicle) => (v.driver ? (driverPhotos.get(driverKey(v.driver)) ?? null) : null);
  // Any change to what's listed starts again from the first page.
  const refilter = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setLimit(PAGE_SIZE);
  };

  return (
    <div className="flex flex-col gap-[18px]">
      <header className="flex flex-wrap items-end gap-4">
        <div className="flex-[1_1_280px]">
          <h1 className="m-0 text-[26px] font-semibold tracking-[-0.01em]">Vehicles</h1>
          <div className="text-[13px] text-oryx-muted mt-0.5">
            {vehicles.length} vehicles · {attentionCount} need attention
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5 items-center">
          <ExportButton
            fileName={exportFileName('vehicles')}
            sheets={() => [vehicleRegisterSheet(filtered, totalsByVehicle)]}
          />
          {isAdmin && (
            <Link to="/vehicles/new" className={BUTTON_PRIMARY}>
              Add vehicle
            </Link>
          )}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2.5 print:hidden">
        <label className="flex items-center gap-2 bg-white border border-oryx-field rounded-lg px-3 h-11 flex-[1_1_280px] max-w-[360px]">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#56626B" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <span className="sr-only">Search vehicles</span>
          <input
            type="search"
            placeholder="Plate, driver, model or chassis"
            value={search}
            onChange={(e) => refilter(setSearch)(e.target.value)}
            className="border-0 outline-none flex-1 min-w-0 bg-transparent text-oryx-ink"
          />
        </label>
        <div role="group" aria-label="Department" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={department === ''}
            onClick={() => refilter(setDepartment)('')}
            className={department === '' ? CHIP_ON : CHIP_OFF}
          >
            All · {vehicles.length}
          </button>
          {shownDepartments.map(([name, count]) => (
            <button
              key={name}
              type="button"
              aria-pressed={department === name}
              onClick={() => refilter(setDepartment)(department === name ? '' : name)}
              className={department === name ? CHIP_ON : CHIP_OFF}
            >
              {name} · {count}
            </button>
          ))}
          {hiddenDepartments > 0 && (
            <button
              type="button"
              aria-expanded={showAllDepartments}
              onClick={() => setShowAllDepartments(!showAllDepartments)}
              className={CHIP_OFF}
            >
              {showAllDepartments ? 'Fewer' : `${hiddenDepartments} more`}
            </button>
          )}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <label className="flex items-center gap-2 text-[13px] text-oryx-muted">
            Status
            <select value={status} onChange={(e) => refilter(setStatus)(e.target.value)} className={SELECT}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-[13px] text-oryx-muted">
            Sort
            <select value={sort} onChange={(e) => refilter(setSort)(e.target.value as Sort)} className={SELECT}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <div role="group" aria-label="View" className="inline-flex border border-oryx-field rounded-lg overflow-hidden bg-white">
            {([['cards', 'Cards'], ['table', 'Table']] as const).map(([v, label]) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`h-9 px-3 text-[13px] ${v === 'table' ? 'border-l border-oryx-field' : ''} ${
                  view === v ? 'bg-oryx-tint text-oryx-blue font-semibold' : 'bg-white text-oryx-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="bg-white border border-oryx-line rounded-xl p-6 text-oryx-muted">No vehicles match these filters.</p>
      ) : view === 'cards' ? (
        <section aria-label="Vehicle list" className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
          {shown.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              totalExpenses={totalsByVehicle.get(v.id) ?? 0}
              attention={attentionById.get(v.id)}
              driverPhotoUrl={photoFor(v)}
            />
          ))}
        </section>
      ) : (
        <div className="bg-white border border-oryx-line rounded-xl overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr className="text-oryx-muted text-left">
                {['Plate', 'Vehicle', 'Driver', 'Department', 'Condition', 'Status', 'Licence expiry'].map((h) => (
                  <th key={h} className="font-medium px-3 first:pl-5 py-2.5 border-b border-oryx-line whitespace-nowrap">
                    {h}
                  </th>
                ))}
                <th className="font-medium pl-3 pr-5 py-2.5 border-b border-oryx-line text-right whitespace-nowrap">
                  Total expenses
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((v) => {
                const attention = attentionById.get(v.id) as VehicleAttention;
                return (
                  <tr key={v.id} className="border-b border-oryx-divider last:border-0 hover:bg-oryx-soft">
                    <td className="pl-5 pr-3 py-2.5">
                      <Link to={`/vehicles/${v.id}`} className="no-underline">
                        <PlateChip plate={v.plate_no} size="sm" />
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {v.brand ?? 'Not Available'} {v.model ?? 'Not Available'}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{v.driver ?? 'Not Assigned'}</td>
                    <td className="px-3 py-2.5 text-oryx-muted whitespace-nowrap">{v.department ?? 'Not Assigned'}</td>
                    <td className="px-3 py-2.5">{v.vehicle_condition ?? 'Not Available'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <TonePill tone={attention.tone}>{attention.label}</TonePill>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(v.vehicle_license_expiry_date)}</td>
                    <td className="pl-3 pr-5 py-2.5 text-right tabular-nums whitespace-nowrap">
                      {formatAED(totalsByVehicle.get(v.id) ?? 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex flex-wrap justify-between items-center gap-3 text-oryx-muted text-[13px] print:hidden">
          <span>
            Showing {shown.length} of {filtered.length}
          </span>
          {shown.length < filtered.length && (
            <button
              type="button"
              onClick={() => setLimit(limit + PAGE_SIZE)}
              className="h-10 px-4 rounded-lg border border-oryx-field bg-white text-oryx-ink font-medium hover:bg-oryx-soft"
            >
              Show more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
