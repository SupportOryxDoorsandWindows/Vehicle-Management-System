import { useOutletContext } from 'react-router-dom';
import type { Vehicle } from '../../types';
import { formatAED } from '../../lib/format';

export function Finance() {
  const vehicle = useOutletContext<Vehicle>();
  const fields: [string, string][] = [
    ['Purchase Price', 'Not Available'],
    ['Finance Amount', formatAED(vehicle.finance_amount)],
    ['Monthly Payment', formatAED(vehicle.monthly_repayment)],
    ['Remaining Balance', 'Not Available'],
    ['Finance Start Date', vehicle.start_date_of_instalments ?? 'Not Available'],
    ['Finance End Date', vehicle.end_date_of_instalments ?? 'Not Available'],
    ['EMI Status', vehicle.emi_status ?? 'Not Available'],
  ];
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
      {fields.map(([label, value]) => (
        <div key={label}>
          <dt className="text-sm text-oryx-silver">{label}</dt>
          <dd className="text-black">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
