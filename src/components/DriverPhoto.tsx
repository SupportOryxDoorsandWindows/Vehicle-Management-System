import { useState } from 'react';
import { getDriverImagePath } from '../lib/driverImage';
import { DriverPlaceholderImage } from './DriverPlaceholderImage';

export function DriverPhoto({ driver, className }: { driver: string | null; className?: string }) {
  const imagePath = getDriverImagePath(driver);
  const [failed, setFailed] = useState(false);

  if (!imagePath || failed) {
    return <DriverPlaceholderImage className={className} />;
  }

  return (
    <img
      src={imagePath}
      alt={driver ?? 'Driver'}
      onError={() => setFailed(true)}
      className={`rounded-full object-cover border border-oryx-silver ${className ?? ''}`}
    />
  );
}
