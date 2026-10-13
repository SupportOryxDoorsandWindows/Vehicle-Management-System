import { useState } from 'react';
import { fetchDriverPhoto, removeDriverPhoto, uploadDriverPhoto } from '../api/driverPhotos';
import { IMAGE_CONTENT_TYPES } from '../api/documents';
import { errorMessage, useLoad } from '../lib/useLoad';
import { useIsAdmin } from '../lib/useIsAdmin';
import { DriverPhoto } from './DriverPhoto';
import { UploadButton } from './DocumentSlot';

/** Driver photo and name, with Upload/Change/Remove for Admins. */
export function DriverPhotoPanel({ driver }: { driver: string | null }) {
  const isAdmin = useIsAdmin();
  const [reloadCount, setReloadCount] = useState(0);
  // The photo is decoration: if it can't load, fall back quietly.
  const { data: photo } = useLoad(
    () => (driver ? fetchDriverPhoto(driver).catch(() => null) : Promise.resolve(null)),
    [driver, reloadCount]
  );
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex items-center gap-4 mb-4">
      <DriverPhoto driver={driver} photoUrl={photo?.url} className="w-28 h-28 shrink-0" />
      <div>
        <p className="text-sm text-oryx-silver">Driver</p>
        <p className="text-black text-lg font-medium">{driver ?? 'Not Assigned'}</p>
        {isAdmin && driver && (
          <div className="flex gap-3 items-center mt-2 print:hidden">
            <UploadButton
              label={photo ? 'new driver photo' : 'driver photo'}
              accept={IMAGE_CONTENT_TYPES}
              onUpload={(file) => run(() => uploadDriverPhoto(driver, file))}
            />
            {photo && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Remove ${driver}'s photo?`)) run(() => removeDriverPhoto(photo));
                }}
                className="text-xs text-red-700 underline"
              >
                Remove photo
              </button>
            )}
          </div>
        )}
        {isAdmin && driver && (
          <p className="text-xs text-oryx-silver mt-1">Shown on every vehicle {driver} drives.</p>
        )}
        {error && (
          <p role="alert" className="text-red-700 text-sm mt-2">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
