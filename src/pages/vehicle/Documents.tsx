import { useOutletContext } from 'react-router-dom';
import { getDocumentStatus } from '../../lib/documentStatus';
import { StatusBadge } from '../../components/StatusBadge';
import { DocumentSlot, FileLink, UploadButton } from '../../components/DocumentSlot';
import { legacyFileNames } from '../../lib/documentFiles';
import { LoadError } from '../../components/LoadError';
import { fetchVehicleDocuments, IMAGE_CONTENT_TYPES } from '../../api/documents';
import { useDocuments } from '../../lib/useDocuments';
import { useIsAdmin } from '../../lib/useIsAdmin';
import { useSettings } from '../../lib/useSettings';
import type { DocumentKind, Vehicle } from '../../types';

const DOCUMENT_ROWS: { label: string; kind: DocumentKind; expiryField: keyof Vehicle | null }[] = [
  { label: 'Vehicle License', kind: 'vehicle_license', expiryField: 'vehicle_license_expiry_date' },
  { label: 'CID Permit', kind: 'cid_permit', expiryField: 'cid_permit_expiry' },
  { label: 'Advertisement Permit', kind: 'advertisement_permit', expiryField: 'advertisement_permit_expiry' },
  { label: 'Mulkiya', kind: 'mulkiya', expiryField: null },
];

export function Documents() {
  const vehicle = useOutletContext<Vehicle>();
  const isAdmin = useIsAdmin();
  const { expiringSoonDays } = useSettings();
  const { loadError, actionError, ofKind, upload, remove } = useDocuments(
    { vehicleId: vehicle.id },
    () => fetchVehicleDocuments(vehicle.id)
  );
  const asOf = new Date();
  const photos = ofKind('vehicle_photo');

  return (
    <div>
      {loadError && <LoadError what="uploaded files" message={loadError} />}
      {actionError && (
        <p role="alert" className="text-red-700 text-sm my-3">
          {actionError}
        </p>
      )}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-oryx-silver">
            <th className="py-2">Document Type</th>
            <th>Expiry Date</th>
            <th>Status</th>
            <th>Files</th>
          </tr>
        </thead>
        <tbody>
          {DOCUMENT_ROWS.map((row) => {
            const expiry = row.expiryField ? (vehicle[row.expiryField] as string | null) : null;
            return (
              <tr key={row.label} className="border-b border-oryx-silver align-top">
                <td className="py-2">{row.label}</td>
                <td className="py-2">{expiry ?? 'Not Available'}</td>
                <td className="py-2">
                  <StatusBadge status={getDocumentStatus(expiry, asOf, expiringSoonDays)} />
                </td>
                <td>
                  <DocumentSlot
                    label={row.label}
                    documents={loadError ? [] : ofKind(row.kind)}
                    legacyNames={row.kind === 'mulkiya' ? legacyFileNames(vehicle.upload_mulkiya) : []}
                    canEdit={isAdmin}
                    onUpload={(file) => upload(row.kind, file)}
                    onRemove={remove}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="text-lg font-semibold text-oryx-blue mt-8 mb-2">Photos</h2>
      {photos === undefined && !loadError ? (
        <p className="text-oryx-silver">Loading...</p>
      ) : (
        <div className="flex flex-wrap gap-4 items-start">
          {(photos ?? []).map((p) => (
            <figure key={p.id} className="w-40">
              {p.url ? (
                <a href={p.url} target="_blank" rel="noreferrer">
                  <img src={p.url} alt={p.file_name} className="w-40 h-28 object-cover rounded border border-oryx-silver" />
                </a>
              ) : (
                <div className="w-40 h-28 rounded border border-oryx-silver bg-gray-50" />
              )}
              <figcaption className="text-xs mt-1">
                <FileLink document={p} />
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Remove ${p.file_name}?`)) remove(p);
                    }}
                    className="ml-2 text-red-700 underline"
                  >
                    Remove
                  </button>
                )}
              </figcaption>
            </figure>
          ))}
          {photos?.length === 0 && !isAdmin && <p className="text-oryx-silver">No photos uploaded.</p>}
          {isAdmin && (
            <UploadButton
              label="photo"
              accept={IMAGE_CONTENT_TYPES}
              onUpload={(file) => upload('vehicle_photo', file)}
            />
          )}
        </div>
      )}

      <h2 className="text-lg font-semibold text-oryx-blue mt-8 mb-2">Other Documents</h2>
      <DocumentSlot
        label="other document"
        documents={loadError ? [] : ofKind('other')}
        legacyNames={legacyFileNames(vehicle.upload_photos_documents)}
        canEdit={isAdmin}
        onUpload={(file) => upload('other', file)}
        onRemove={remove}
      />
    </div>
  );
}
