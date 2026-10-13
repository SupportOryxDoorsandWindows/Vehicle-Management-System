import { useState, type ReactNode } from 'react';
import { DEFAULT_EXPIRING_SOON_DAYS, fetchSettings } from '../api/settings';
import { SettingsContext } from '../lib/useSettings';
import { useLoad } from '../lib/useLoad';

/** Loads app settings once for the signed-in app. Pages never wait on it: defaults apply meanwhile. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [reloadCount, setReloadCount] = useState(0);
  const { data } = useLoad(fetchSettings, [reloadCount]);

  return (
    <SettingsContext.Provider
      value={{
        expiringSoonDays: data?.expiring_soon_days ?? DEFAULT_EXPIRING_SOON_DAYS,
        reload: () => setReloadCount((n) => n + 1),
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
