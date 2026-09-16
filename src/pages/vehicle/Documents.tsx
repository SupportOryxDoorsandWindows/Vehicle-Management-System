import { useOutletContext } from 'react-router-dom';
import { getDocumentStatus } from '../../lib/documentStatus';
import { StatusBadge } from '../../components/StatusBadge';
import type { Vehicle } from '../../types';

const DOCUMENT_ROWS: { label: string; expiryField: keyof Vehicle }[] = [
  { label: 'Vehicle License', expiryField: 'vehicle_license_expiry_date' },
  { label: 'CID Permit', expiryField: 'cid_permit_expiry' },
  { label: 'Advertisement Permit', expiryField: 'advertisement_permit_expiry' },
];

export function Documents() {
  const vehicle = useOutletContext<Vehicle>();
  const asOf = new Date();

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-oryx-silver">
          <th className="py-2">Document Type</th>
          <th>Expiry Date</th>
          <th>Status</th>
          <th>Uploaded File</th>
        </tr>
      </thead>
      <tbody>
        {DOCUMENT_ROWS.map((row) => {
          const expiry = vehicle[row.expiryField] as string | null;
          return (
            <tr key={row.label} className="border-b border-oryx-silver">
              <td className="py-2">{row.label}</td>
              <td>{expiry ?? 'Not Available'}</td>
              <td>
                <StatusBadge status={getDocumentStatus(expiry, asOf)} />
              </td>
              <td>Not Available</td>
            </tr>
          );
        })}
        <tr className="border-b border-oryx-silver">
          <td className="py-2">Mulkiya</td>
          <td>Not Available</td>
          <td>
            <StatusBadge status="not_available" />
          </td>
          <td>{vehicle.upload_mulkiya ?? 'Not Available'}</td>
        </tr>
      </tbody>
    </table>
  );
}
