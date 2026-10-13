import type { ReactNode } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { fetchExpensesByVehicle } from '../../api/expenses';
import { fetchServiceRecords } from '../../api/serviceRecords';
import { formatAED } from '../../lib/format';
import { LoadError } from '../../components/LoadError';
import { ExportButton } from '../../components/ExportButtons';
import { ServiceDueBadge } from '../../components/ServiceDueBadge';
import { buildSheet, exportFileName } from '../../lib/exportExcel';
import { formatKm, serviceKindLabel, summarizeServiceLog } from '../../lib/serviceLog';
import { useLoad } from '../../lib/useLoad';
import { useIsAdmin } from '../../lib/useIsAdmin';
import { useSettings } from '../../lib/useSettings';
import type { ServiceRecord, Vehicle } from '../../types';

function nextServiceText(date: string | null, km: number | null): string {
  return [date, km != null ? formatKm(km) : null].filter(Boolean).join(' or ') || 'Not Available';
}

export function Maintenance() {
  const vehicle = useOutletContext<Vehicle>();
  const isAdmin = useIsAdmin();
  const { expiringSoonDays } = useSettings();
  const { data, error } = useLoad(
    () =>
      Promise.all([
        fetchServiceRecords(vehicle.id),
        fetchExpensesByVehicle(vehicle.id).then((expenses) =>
          expenses.filter((e) => e.system_category === 'maintenance' || e.system_category === 'repairs')
        ),
      ]),
    [vehicle.id]
  );

  if (error) return <LoadError what="maintenance records" message={error} />;
  if (!data) return <p>Loading...</p>;
  const [log, expenses] = data;
  const { odometer, lastService, nextService } = summarizeServiceLog(log, new Date(), expiringSoonDays);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryBox label="Current Odometer">
          {odometer ? (
            <>
              {formatKm(odometer.km)}
              <Detail>on {odometer.date}</Detail>
            </>
          ) : (
            'Not recorded yet'
          )}
        </SummaryBox>
        <SummaryBox label="Last Service">
          {lastService ? (
            <>
              {lastService.record_date}
              {lastService.odometer_km != null && <Detail>at {formatKm(lastService.odometer_km)}</Detail>}
            </>
          ) : vehicle.last_service_mileage_km != null ? (
            <>
              {formatKm(vehicle.last_service_mileage_km)}
              <Detail>from the original spreadsheet</Detail>
            </>
          ) : (
            'Not Available'
          )}
        </SummaryBox>
        <SummaryBox label="Next Service">
          {nextService ? (
            <>
              {nextServiceText(nextService.date, nextService.km)}
              <span className="block mt-1">
                <ServiceDueBadge status={nextService.status} />
              </span>
            </>
          ) : (
            'Not Available'
          )}
        </SummaryBox>
      </div>

      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-oryx-blue">Service &amp; Mileage Log</h2>
        <div className="flex gap-2 items-center">
          <ExportButton
            fileName={exportFileName(`${vehicle.plate_no} service log`)}
            sheets={() => [serviceLogSheet(log)]}
          />
          {isAdmin && (
            <Link
              to="new"
              className="bg-oryx-blue text-white rounded px-3 py-1 text-sm print:hidden"
            >
              Add record
            </Link>
          )}
        </div>
      </div>
      <table className="w-full text-left text-sm mb-8">
        <thead>
          <tr className="border-b border-oryx-silver">
            <th className="py-2">Date</th>
            <th>Type</th>
            <th>Odometer</th>
            <th>Garage</th>
            <th>Description</th>
            <th>Next Service</th>
            {isAdmin && <th className="print:hidden" />}
          </tr>
        </thead>
        <tbody>
          {log.map((r) => (
            <tr key={r.id} className="border-b border-oryx-silver">
              <td className="py-2">{r.record_date}</td>
              <td>{serviceKindLabel(r.kind)}</td>
              <td>{r.odometer_km != null ? formatKm(r.odometer_km) : ''}</td>
              <td>{r.garage}</td>
              <td>{r.description}</td>
              <td>
                {r.next_service_date || r.next_service_km != null
                  ? nextServiceText(r.next_service_date, r.next_service_km)
                  : ''}
              </td>
              {isAdmin && (
                <td className="print:hidden">
                  <Link to={`${r.id}/edit`} className="text-oryx-blue underline">
                    Edit
                  </Link>
                </td>
              )}
            </tr>
          ))}
          {log.length === 0 && (
            <tr>
              <td colSpan={isAdmin ? 7 : 6} className="py-4 text-oryx-silver">
                No services or odometer readings logged yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 className="text-lg font-semibold text-oryx-blue mb-2">Maintenance &amp; Repair Expenses</h2>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-oryx-silver">
            <th className="py-2">Date</th>
            <th>Service Type</th>
            <th>Cost</th>
            <th>Supplier</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((r) => (
            <tr key={r.id} className="border-b border-oryx-silver">
              <td className="py-2">{r.date ?? 'Not Available'}</td>
              <td>{r.expense ?? 'Not Available'}</td>
              <td>{formatAED(r.cost)}</td>
              <td>{r.supplier_name ?? 'Not Available'}</td>
              <td>{r.expense_description ?? 'Not Available'}</td>
            </tr>
          ))}
          {expenses.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-oryx-silver">
                No maintenance or repair expenses for this vehicle.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SummaryBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border border-oryx-silver rounded-lg p-4">
      <p className="text-sm text-oryx-silver">{label}</p>
      <div className="text-lg font-bold text-oryx-blue">{children}</div>
    </div>
  );
}

function Detail({ children }: { children: ReactNode }) {
  return <span className="block text-sm font-normal text-oryx-silver">{children}</span>;
}

function serviceLogSheet(log: ServiceRecord[]) {
  return buildSheet(
    'Service Log',
    [
      { header: 'Date', kind: 'date', value: (r) => r.record_date },
      { header: 'Type', value: (r) => serviceKindLabel(r.kind), width: 20 },
      { header: 'Odometer (KM)', kind: 'number', value: (r) => r.odometer_km, width: 14 },
      { header: 'Garage', value: (r) => r.garage },
      { header: 'Description', value: (r) => r.description, width: 36 },
      { header: 'Next Service Date', kind: 'date', value: (r) => r.next_service_date, width: 16 },
      { header: 'Next Service (KM)', kind: 'number', value: (r) => r.next_service_km, width: 16 },
    ],
    log
  );
}
