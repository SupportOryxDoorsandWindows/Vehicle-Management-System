import { createContext, useContext } from 'react';
import { DEFAULT_EXPIRING_SOON_DAYS } from '../api/settings';

export interface SettingsState {
  /** Days before expiry that count as "Expiring Soon"; the default until settings load. */
  expiringSoonDays: number;
  reload: () => void;
}

export const SettingsContext = createContext<SettingsState>({
  expiringSoonDays: DEFAULT_EXPIRING_SOON_DAYS,
  reload: () => {},
});

export function useSettings(): SettingsState {
  return useContext(SettingsContext);
}
