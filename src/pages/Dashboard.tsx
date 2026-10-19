import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchVehicles } from '../api/vehicles';
import { fetchAllExpenses, fetchUnassignedExpenses } from '../api/expenses';
import { fetchAllServiceRecords } from '../api/serviceRecords';
import { summarizeServiceLog } from '../lib/serviceLog';
import { getDocumentStatus } from '../lib/documentStatus';
import { formatAED, formatDate } from '../lib/format';
import { daysUntil, licenceDueText, URGENT_DAYS } from '../lib/vehicleAttention';
import { CATEGORY_LABELS } from '../lib/exportSheets';
import { LoadError } from '../components/LoadError';
import { PlateChip } from '../components/PlateChip';
import { BUTTON, BUTTON_PRIMARY, BUTTON_SMALL, BUTTON_SMALL_PRIMARY, CARD, LINK, TONE_CLASSES } from '../components/ui';
import { useLoad } from '../lib/useLoad';
import { useSettings } from '../lib/useSettings';
import { useIsAdmin } from '../lib/useIsAdmin';
import type { Expense, ServiceRecord, Vehicle } from '../types';

const TABLE_ROWS = 6;
/** Above this share of all spend, "Other" is too big for the chart to tell you much. */
const OTHER_SHARE_WARNING = 0.5;

const ICONS = {
  licence: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M12 12v3M12 18h.01" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h4" />
    </>
  ),
  gauge: (
    <>
      <path d="M12 3v3M5 12H2M22 12h-3" />
      <circle cx="12" cy="13" r="7" />
      <path d="M12 13l3-3" />
    </>
  ),
};

interface AttentionItem {
  key: string;
  tone: 'red' | 'amber' | 'blue';
  icon: keyof typeof ICONS;
  title: ReactNode;
  detail: string;
  action: { to: string; label: string; primary?: boolean };
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const iconTone = item.tone === 'blue' ? 'bg-oryx-tint text-oryx-blue' : TONE_CLASSES[item.tone];
  return (
    <div className="flex flex-wrap items-center gap-4 px-5 py-4 border-b border-[#ECECE7] last:border-0">
      <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center flex-none ${iconTone}`}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          {ICONS[item.icon]}
        </svg>
      </div>
      <div className="flex-[1_1_360px] min-w-0">
        <div className="flex flex-wrap items-center gap-2 font-semibold">{item.title}</div>
        <div className="text-oryx-muted mt-1">{item.detail}</div>
      </div>
      <Link to={item.action.to} className={item.action.primary ? BUTTON_SMALL_PRIMARY : BUTTON_SMALL}>
        {item.action.label}
      </Link>
    </div>
  );
}

function Panel({ title, aside, children, flush }: { title: string; aside?: ReactNode; children: ReactNode; flush?: boolean }) {
  const id = `panel-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  return (
    <section aria-labelledby={id} className={`${CARD} ${flush ? 'pt-[18px] pb-2' : 'px-5 py-[18px]'}`}>
      <div className={`flex justify-between items-baseline gap-3 ${flush ? 'px-5 pb-2.5' : 'mb-3.5'}`}>
        <h2 id={id} className="m-0 text-[15px] font-semibold">
          {title}
        </h2>
        {aside && <span className="text-[13px] text-oryx-muted">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Bars({ rows, color, labelWidth }: { rows: { name: string; value: number; text: string }[]; color: string; labelWidth: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.name} className="grid items-center gap-3" style={{ gridTemplateColumns: `${labelWidth} minmax(0,1fr) auto` }}>
          <span className="truncate">{r.name}</span>
          <span className="h-2.5 bg-oryx-track rounded-[3px] overflow-hidden" aria-hidden="true">
            <span className="block h-full rounded-[3px]" style={{ background: color, width: `${Math.max(0.6, (r.value / max) * 100)}%` }} />
          </span>
          <span className="text-right tabular-nums min-w-8">{r.text}</span>
        </div>
      ))}
    </div>
  );
}

const TH = 'font-medium px-2 py-2 border-b border-[#ECECE7] text-left first:pl-5 last:pr-5 last:text-right';
const TD = 'px-2 py-2.5 border-b border-oryx-divider first:pl-5 last:pr-5 last:text-right';

export function Dashboard() {
  const { data, error } = useLoad(
    () =>
      Promise.all([
        fetchVehicles(),
        fetchAllExpenses(),
        fetchUnassignedExpenses(),
        // Only the service reminder depends on it: if it fails, show the rest of the dashboard.
        fetchAllServiceRecords().catch(() => null),
      ]),
    []
  );
  const { expiringSoonDays } = useSettings();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  if (error) return <LoadError what="the dashboard" message={error} />;
  if (!data) return <p>Loading...</p>;
  const [vehicles, expenses, unassigned, serviceRecords] = data;
  const asOf = new Date();
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  const totalsByVehicle = new Map<string, number>();
  for (const e of expenses) {
    if (!e.vehicle_id || e.cost == null) continue;
    totalsByVehicle.set(e.vehicle_id, (totalsByVehicle.get(e.vehicle_id) ?? 0) + e.cost);
  }
  const sum = (list: Expense[]) => list.reduce((total, e) => total + (e.cost ?? 0), 0);
  const thisYear = asOf.getFullYear();
  const totalSpend = sum(expenses);
  const thisYearSpend = sum(expenses.filter((e) => !!e.date && Number(e.date.slice(0, 4)) === thisYear));
  const unassignedSpend = sum(unassigned);

  const active = vehicles.filter((v) => v.status === 'active');
  const departmentCounts = new Map<string, number>();
  for (const v of vehicles) {
    const name = v.department ?? 'Not Assigned';
    departmentCounts.set(name, (departmentCounts.get(name) ?? 0) + 1);
  }

  // Licences: active vehicles whose licence has expired or falls within the "Expiring Soon" days.
  const licences = active
    .map((v) => ({ vehicle: v, status: getDocumentStatus(v.vehicle_license_expiry_date, asOf, expiringSoonDays) }))
    .filter((l) => l.status === 'expired' || l.status === 'expiring_soon')
    .map((l) => ({ ...l, days: daysUntil(l.vehicle.vehicle_license_expiry_date as string, asOf) }))
    .sort((a, b) => a.days - b.days);
  const expiredCount = licences.filter((l) => l.status === 'expired').length;
  const dueCount = licences.length - expiredCount;
  const nextDue = licences.find((l) => l.status === 'expiring_soon');

  let servicesDue: Vehicle[] | null = null;
  if (serviceRecords) {
    const logByVehicle = new Map<string, ServiceRecord[]>();
    for (const r of serviceRecords) logByVehicle.set(r.vehicle_id, [...(logByVehicle.get(r.vehicle_id) ?? []), r]);
    servicesDue = active.filter((v) => {
      const status = summarizeServiceLog(logByVehicle.get(v.id) ?? [], asOf, expiringSoonDays).nextService?.status;
      return status === 'overdue' || status === 'due_soon';
    });
  }

  const attention: AttentionItem[] = [];
  if (licences.length > 0) {
    const [first, ...rest] = licences;
    const v = first.vehicle;
    const others = rest.slice(0, 3).map((l) => `${l.vehicle.plate_no} (${formatDate(l.vehicle.vehicle_license_expiry_date, { year: false })})`);
    const more = rest.length > 3 ? `, and ${rest.length - 3} more` : '';
    attention.push({
      key: 'licences',
      tone: first.days <= URGENT_DAYS ? 'red' : 'amber',
      icon: 'licence',
      title: (
        <>
          <PlateChip plate={v.plate_no} />
          <span>Vehicle {licenceDueText(first.days).toLowerCase()}</span>
          <span className={`text-xs font-semibold rounded px-1.5 py-0.5 ${TONE_CLASSES[first.days <= URGENT_DAYS ? 'red' : 'amber']}`}>
            {formatDate(v.vehicle_license_expiry_date, { year: false, weekday: true })}
          </span>
        </>
      ),
      detail:
        [`${v.brand ?? ''} ${v.model ?? ''}`.trim() || 'Vehicle', v.driver ?? 'No driver', v.department ?? 'No department'].join(' · ') +
        '.' +
        (others.length ? ` Also expired or due within ${expiringSoonDays} days: ${others.join(', ')}${more}.` : ''),
      action: { to: '/vehicles?sort=attention', label: 'Review renewals' },
    });
  }
  if (unassigned.length > 0) {
    attention.push({
      key: 'unassigned',
      tone: 'amber',
      icon: 'receipt',
      title: `${unassigned.length} ${unassigned.length === 1 ? "expense isn't" : "expenses aren't"} assigned to a vehicle`,
      detail: `${formatAED(unassignedSpend)} is missing from per-vehicle costs and reports until each is matched to a plate.`,
      action: { to: '/unassigned-expenses', label: 'Assign expenses', primary: true },
    });
  }
  if (servicesDue && servicesDue.length > 0) {
    attention.push({
      key: 'services',
      tone: 'amber',
      icon: 'gauge',
      title: `${servicesDue.length} ${servicesDue.length === 1 ? 'vehicle is' : 'vehicles are'} due for a service`,
      detail: `${servicesDue.slice(0, 4).map((v) => v.plate_no).join(', ')}${servicesDue.length > 4 ? ` and ${servicesDue.length - 4} more` : ''}: overdue, or due within ${expiringSoonDays} days or 1,000 km.`,
      action: { to: `/vehicles/${servicesDue[0].id}/maintenance`, label: 'Open service log' },
    });
  } else if (serviceRecords && serviceRecords.length === 0) {
    attention.push({
      key: 'readings',
      tone: 'blue',
      icon: 'gauge',
      title: 'No odometer readings logged yet',
      detail: "Record each vehicle's mileage on its Maintenance tab and Oryx Fleet will warn you before services fall due.",
      action: { to: '/vehicles', label: 'Log readings' },
    });
  }

  const kpis = [
    {
      label: 'Vehicles',
      value: String(vehicles.length),
      sub: `${active.length === vehicles.length ? 'All' : active.length} active · ${departmentCounts.size} departments`,
    },
    { label: 'Spend this year', value: formatAED(thisYearSpend), sub: `${formatAED(totalSpend)} all time` },
    {
      label: `Licences due in ${expiringSoonDays} days`,
      value: String(dueCount),
      sub:
        expiredCount > 0
          ? `${expiredCount} already expired`
          : nextDue
            ? `Next: ${nextDue.vehicle.plate_no} on ${formatDate(nextDue.vehicle.vehicle_license_expiry_date, { year: false })}`
            : 'None due',
    },
    { label: 'Not assigned to a vehicle', value: formatAED(unassignedSpend), sub: `${unassigned.length} expenses` },
  ];

  const byCategory = new Map<string, number>();
  for (const e of expenses) byCategory.set(e.system_category, (byCategory.get(e.system_category) ?? 0) + (e.cost ?? 0));
  const categories = [...byCategory]
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      name: CATEGORY_LABELS[category] ?? category,
      value: amount,
      text: Math.round(amount).toLocaleString('en-AE'),
    }));
  const otherShare = totalSpend > 0 ? (byCategory.get('other') ?? 0) / totalSpend : 0;

  const departments = [...departmentCounts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, value: count, text: String(count) }));

  const top = vehicles
    .map((vehicle) => ({ vehicle, total: totalsByVehicle.get(vehicle.id) ?? 0 }))
    .filter((t) => t.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, TABLE_ROWS);

  const latest = expenses
    .filter((e) => !!e.date)
    .sort((a, b) => ((a.date as string) < (b.date as string) ? 1 : (a.date as string) > (b.date as string) ? -1 : 0))
    .slice(0, TABLE_ROWS);

  const today = asOf.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end gap-4">
        <div className="flex-[1_1_280px]">
          <div className="text-[13px] text-oryx-muted">{today.replace(',', '')}</div>
          <h1 className="mt-0.5 mb-0 text-[26px] font-semibold tracking-[-0.01em]">Fleet overview</h1>
        </div>
        <div className="flex flex-wrap gap-2.5 items-center">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/vehicles?q=${encodeURIComponent(search.trim())}`);
            }}
            className="flex items-center gap-2 bg-white border border-oryx-field rounded-lg px-3 h-11 min-w-[260px] flex-1"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#56626B" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <label htmlFor="dashboard-search" className="sr-only">
              Search vehicles
            </label>
            <input
              id="dashboard-search"
              type="search"
              placeholder="Search plate, driver or chassis"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 outline-none flex-1 min-w-0 bg-transparent text-oryx-ink"
            />
          </form>
          {isAdmin && (
            <>
              <Link to="/vehicles/new" className={BUTTON}>
                Add vehicle
              </Link>
              <Link to="/expenses/new" className={BUTTON_PRIMARY}>
                Add expense
              </Link>
            </>
          )}
        </div>
      </header>

      <section aria-labelledby="attention" className={CARD}>
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#ECECE7]">
          <h2 id="attention" className="m-0 text-[15px] font-semibold">
            Needs attention
          </h2>
          <span className="text-xs font-semibold bg-oryx-ink text-white rounded-full px-2 py-px">{attention.length}</span>
        </div>
        {attention.length === 0 ? (
          <p className="m-0 px-5 py-4 text-oryx-muted">Nothing needs attention right now.</p>
        ) : (
          attention.map((item) => <AttentionRow key={item.key} item={item} />)
        )}
      </section>

      <section aria-label="Key figures" className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        {kpis.map((k) => (
          <div key={k.label} className={`${CARD} px-5 py-[18px]`}>
            <div className="text-[13px] text-oryx-muted">{k.label}</div>
            <div className="text-[28px] font-semibold tracking-[-0.01em] mt-1.5 tabular-nums">{k.value}</div>
            <div className="text-[13px] text-oryx-muted mt-0.5">{k.sub}</div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] gap-4">
        <Panel title="Spend by category" aside={`All time · ${formatAED(totalSpend)}`}>
          {categories.length === 0 ? (
            <p className="m-0 text-oryx-muted">No expenses recorded yet.</p>
          ) : (
            <Bars rows={categories} color="#022A3A" labelWidth="104px" />
          )}
          {otherShare > OTHER_SHARE_WARNING && (
            <p className="mt-4 mb-0 text-[13px] text-oryx-muted">
              "Other" is {Math.round(otherShare * 100)}% of all spend: it holds uniforms, tools and vehicle modifications.
              Splitting it into real categories would make this chart useful.
            </p>
          )}
        </Panel>
        <Panel title="Vehicles by department" aside={`${vehicles.length} vehicles`}>
          <Bars rows={departments} color="#5E8A9C" labelWidth="120px" />
        </Panel>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] gap-4">
        <Panel
          flush
          title="Highest-cost vehicles"
          aside={
            <Link to="/vehicles?sort=spend" className={LINK}>
              All vehicles
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="text-oryx-muted">
                  <th className={TH}>Plate</th>
                  <th className={TH}>Vehicle</th>
                  <th className={TH}>Driver</th>
                  <th className={TH}>Spend</th>
                </tr>
              </thead>
              <tbody>
                {top.map(({ vehicle: v, total }) => (
                  <tr key={v.id} className="hover:bg-oryx-soft">
                    <td className={TD}>
                      <Link to={`/vehicles/${v.id}`} className="no-underline">
                        <PlateChip plate={v.plate_no} size="sm" />
                      </Link>
                    </td>
                    <td className={`${TD} whitespace-nowrap`}>
                      {v.brand ?? ''} {v.model ?? ''}
                    </td>
                    <td className={`${TD} text-oryx-muted whitespace-nowrap`}>{v.driver ?? 'Not Assigned'}</td>
                    <td className={`${TD} tabular-nums whitespace-nowrap`}>{formatAED(total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {top.length === 0 && <p className="px-5 py-3 m-0 text-oryx-muted">No vehicle has expenses yet.</p>}
          </div>
        </Panel>

        <Panel
          flush
          title="Latest expenses"
          aside={
            <Link to="/reports" className={LINK}>
              Reports
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="text-oryx-muted">
                  <th className={TH}>Date</th>
                  <th className={TH}>Expense</th>
                  <th className={TH}>Vehicle</th>
                  <th className={TH}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((e) => {
                  const v = e.vehicle_id ? vehicleById.get(e.vehicle_id) : undefined;
                  return (
                    <tr key={e.id}>
                      <td className={`${TD} text-oryx-muted whitespace-nowrap`}>{formatDate(e.date, { year: false })}</td>
                      <td className={TD}>
                        <div>{e.expense ?? e.type_of_expense ?? 'Expense'}</div>
                        {e.supplier_name && <div className="text-xs text-oryx-muted">{e.supplier_name}</div>}
                      </td>
                      <td className={`${TD} whitespace-nowrap`}>
                        {v ? (
                          <Link to={`/vehicles/${v.id}`} className="no-underline">
                            <PlateChip plate={v.plate_no} size="sm" />
                          </Link>
                        ) : (
                          <Link
                            to="/unassigned-expenses"
                            className="text-xs font-semibold text-oryx-amber bg-oryx-amber-bg rounded px-[7px] py-[3px] no-underline"
                          >
                            Assign
                          </Link>
                        )}
                      </td>
                      <td className={`${TD} tabular-nums whitespace-nowrap`}>{formatAED(e.cost)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {latest.length === 0 && <p className="px-5 py-3 m-0 text-oryx-muted">No expenses recorded yet.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
