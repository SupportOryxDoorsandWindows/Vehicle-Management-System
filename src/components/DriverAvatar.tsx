import { useState } from 'react';
import { driverInitials, getDriverImagePath } from '../lib/driverImage';

/**
 * A round driver photo: the uploaded one, else the photo bundled with the app
 * for this name, else the driver's initials.
 */
export function DriverAvatar({ driver, photoUrl }: { driver: string | null; photoUrl?: string | null }) {
  const imagePath = photoUrl ?? getDriverImagePath(driver);
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const ring = 'w-12 h-12 flex-none rounded-full border-2 border-white shadow-[0_0_0_1px_#E2E2DC]';

  if (imagePath && failedPath !== imagePath) {
    return (
      <img
        src={imagePath}
        alt={driver ?? 'Driver'}
        onError={() => setFailedPath(imagePath)}
        className={`${ring} object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${ring} bg-oryx-tint text-oryx-blue inline-flex items-center justify-center text-[15px] font-semibold`}
    >
      {driver ? driverInitials(driver) : '?'}
    </span>
  );
}
