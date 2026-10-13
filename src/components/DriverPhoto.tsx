import { useState } from 'react';
import { getDriverImagePath } from '../lib/driverImage';
import { DriverPlaceholderImage } from './DriverPlaceholderImage';

/**
 * Shows, in order of preference: an uploaded photo (photoUrl), the photo bundled
 * with the app for this driver's name, or a placeholder.
 */
export function DriverPhoto({
  driver,
  photoUrl,
  className,
}: {
  driver: string | null;
  photoUrl?: string | null;
  className?: string;
}) {
  const imagePath = photoUrl ?? getDriverImagePath(driver);
  const [failedPath, setFailedPath] = useState<string | null>(null);

  if (!imagePath || failedPath === imagePath) {
    return <DriverPlaceholderImage className={className} />;
  }

  return (
    <img
      src={imagePath}
      alt={driver ?? 'Driver'}
      onError={() => setFailedPath(imagePath)}
      className={`rounded-full object-cover border border-oryx-silver ${className ?? ''}`}
    />
  );
}
