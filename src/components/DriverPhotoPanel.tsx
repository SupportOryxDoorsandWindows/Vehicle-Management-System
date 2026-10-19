import { useState } from 'react';
import { fetchDriverPhoto, removeDriverPhoto, uploadDriverPhoto } from '../api/driverPhotos';
import { IMAGE_CONTENT_TYPES } from '../api/documents';
import { errorMessage, useLoad } from '../lib/useLoad';
import { useIsAdmin } from '../lib/useIsAdmin';
import { getDriverImagePath } from '../lib/driverImage';
import { UploadButton } from './DocumentSlot';

function Silhouette() {
  return (
    <svg role="img" aria-label="No driver photo yet" width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="24" r="12" fill="#022A3A" />
      <path d="M8 64c0-14 10.7-22 24-22s24 8 24 22z" fill="#022A3A" />
    </svg>
  );
}

/**
 * The driver box in a vehicle's header: their photo (uploaded, else bundled with
 * the app, else a silhouette), name and department, with Upload/Change/Remove for Admins.
 */
export function DriverPhotoPanel({ driver, department }: { driver: string | null; department?: string | null }) {
  const isAdmin = useIsAdmin();
  const [reloadCount, setReloadCount] = useState(0);
  // The photo is decoration: if it can't load, fall back quietly.
  const { data: photo } = useLoad(
    () => (driver ? fetchDriverPhoto(driver).catch(() => null) : Promise.resolve(null)),
    [driver, reloadCount]
  );
  const [error, setError] = useState<string | null>(null);
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const imagePath = photo?.url ?? getDriverImagePath(driver);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    }
    setReloadCount((n) => n + 1);
  }

  return (
    <div className="flex items-center gap-3.5 bg-white border border-oryx-line rounded-[14px] py-2.5 pl-2.5 pr-4">
      <div className="relative w-[84px] h-[84px] flex-none rounded-xl border-2 border-oryx-blue bg-oryx-ground flex items-end justify-center overflow-hidden">
        {imagePath && failedPath !== imagePath ? (
          <img
            src={imagePath}
            alt={driver ?? 'Driver'}
            onError={() => setFailedPath(imagePath)}
            className="w-full h-full object-cover"
          />
        ) : (
          <Silhouette />
        )}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-oryx-muted">Driver</div>
        <div className="font-semibold text-base">{driver ?? 'Not Assigned'}</div>
        {department && <div className="text-[13px] text-oryx-muted">{department}</div>}
        {isAdmin && driver && (
          <div className="flex gap-3 items-center mt-1.5 print:hidden">
            <UploadButton
              label={photo ? 'new driver photo' : 'driver photo'}
              text={photo ? 'Change photo' : 'Upload photo'}
              accept={IMAGE_CONTENT_TYPES}
              onUpload={(file) => run(() => uploadDriverPhoto(driver, file))}
              className="inline-flex items-center h-8 px-2.5 rounded-lg border border-oryx-field bg-white text-xs font-medium text-oryx-ink hover:bg-oryx-soft"
            />
            {photo && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Remove ${driver}'s photo?`)) run(() => removeDriverPhoto(photo));
                }}
                className="text-xs text-oryx-red underline"
              >
                Remove photo
              </button>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="text-oryx-red text-[13px] mt-1.5 max-w-[240px]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
