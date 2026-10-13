import { useState, type FormEvent } from 'react';
import {
  fetchSettings,
  MAX_EXPIRING_SOON_DAYS,
  MIN_EXPIRING_SOON_DAYS,
  parseExpiringSoonDays,
  updateExpiringSoonDays,
  type AppSettings,
} from '../api/settings';
import { fetchProfiles } from '../api/profiles';
import { LoadError } from '../components/LoadError';
import { errorMessage, useLoad } from '../lib/useLoad';
import { useSettings } from '../lib/useSettings';

export function Settings() {
  const { data, error } = useLoad(() => Promise.all([fetchSettings(), fetchProfiles()]), []);

  if (error) return <LoadError what="settings" message={error} />;
  if (!data) return <p>Loading...</p>;
  const [settings, profiles] = data;
  return <SettingsForm initial={settings} emailById={new Map(profiles.map((p) => [p.id, p.email]))} />;
}

function SettingsForm({ initial, emailById }: { initial: AppSettings; emailById: Map<string, string> }) {
  const { reload } = useSettings();
  const [current, setCurrent] = useState(initial);
  const [value, setValue] = useState(String(initial.expiring_soon_days));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    const days = parseExpiringSoonDays(value);
    if (typeof days === 'string') {
      setError(days);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      setCurrent(await updateExpiringSoonDays(days));
      setSaved(true);
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
    setSaving(false);
  }

  const changedBy = current.updated_by ? (emailById.get(current.updated_by) ?? 'Unknown user') : null;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-oryx-blue mb-4">Settings</h1>
      <form onSubmit={handleSubmit} noValidate>
        <fieldset>
          <legend className="text-lg font-semibold text-oryx-blue mb-2">Document reminders</legend>
          <label htmlFor="expiring-soon-days" className="block text-sm mb-1">
            Show a document as <strong>Expiring Soon</strong> this many days before it expires
          </label>
          <div className="flex gap-3 items-center">
            <input
              id="expiring-soon-days"
              type="number"
              inputMode="numeric"
              min={MIN_EXPIRING_SOON_DAYS}
              max={MAX_EXPIRING_SOON_DAYS}
              step={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={error ? true : undefined}
              className="border border-oryx-silver rounded px-3 py-2 w-28"
            />
            <span className="text-sm">days</span>
            <button
              type="submit"
              disabled={saving}
              className="bg-oryx-blue text-white rounded px-4 py-2 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <p className="text-sm text-oryx-silver mt-2">
            Used by the Documents tab and the Dashboard's Upcoming Renewals and Expired Documents tiles.
          </p>
        </fieldset>
      </form>
      {error && (
        <p role="alert" className="text-red-700 text-sm mt-3">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-green-800 text-sm mt-3">
          Saved. Documents expiring within {current.expiring_soon_days} days now show as Expiring Soon.
        </p>
      )}
      {changedBy && (
        <p className="text-sm text-oryx-silver mt-6">
          Last changed by {changedBy} on{' '}
          {new Date(current.updated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}.
        </p>
      )}
    </div>
  );
}
