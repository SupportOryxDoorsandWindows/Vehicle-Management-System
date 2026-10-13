import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from '../Settings';
import * as settingsApi from '../../api/settings';
import * as profilesApi from '../../api/profiles';
import { SettingsContext } from '../../lib/useSettings';

const settings = { expiring_soon_days: 30, updated_by: 'u1', updated_at: '2026-10-01T10:00:00Z' };

function renderPage(reload = vi.fn()) {
  render(
    <SettingsContext.Provider value={{ expiringSoonDays: 30, reload }}>
      <Settings />
    </SettingsContext.Provider>
  );
  return reload;
}

beforeEach(() => {
  vi.spyOn(settingsApi, 'fetchSettings').mockResolvedValue(settings);
  vi.spyOn(settingsApi, 'updateExpiringSoonDays').mockImplementation(async (days) => ({
    ...settings,
    expiring_soon_days: days,
    updated_at: '2026-10-13T08:00:00Z',
  }));
  vi.spyOn(profilesApi, 'fetchProfiles').mockResolvedValue([
    { id: 'u1', email: 'admin@oryxdoors.com', role: 'admin', active: true, created_at: '', updated_at: '' },
  ]);
});

describe('Settings', () => {
  it('shows the current value and who last changed it', async () => {
    renderPage();
    expect(await screen.findByLabelText(/Expiring Soon/)).toHaveValue(30);
    expect(screen.getByText(/Last changed by admin@oryxdoors.com/)).toBeInTheDocument();
  });

  it('saves a new value and refreshes it for the whole app', async () => {
    const reload = renderPage();
    const input = await screen.findByLabelText(/Expiring Soon/);
    await userEvent.clear(input);
    await userEvent.type(input, '45');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(settingsApi.updateExpiringSoonDays).toHaveBeenCalledWith(45);
    expect(await screen.findByRole('status')).toHaveTextContent('within 45 days');
    expect(reload).toHaveBeenCalled();
  });

  it('rejects values outside 1-365 without saving', async () => {
    renderPage();
    const input = await screen.findByLabelText(/Expiring Soon/);
    await userEvent.clear(input);
    await userEvent.type(input, '400');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('alert')).toHaveTextContent('between 1 and 365');
    expect(settingsApi.updateExpiringSoonDays).not.toHaveBeenCalled();
  });

  it('shows why a save failed', async () => {
    vi.spyOn(settingsApi, 'updateExpiringSoonDays').mockRejectedValue(new Error("The change wasn't saved."));
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("The change wasn't saved.");
  });
});

describe('parseExpiringSoonDays', () => {
  it('accepts whole numbers from 1 to 365', () => {
    expect(settingsApi.parseExpiringSoonDays(' 1 ')).toBe(1);
    expect(settingsApi.parseExpiringSoonDays('365')).toBe(365);
  });

  it('rejects blanks, decimals, zero, negatives and values over 365', () => {
    for (const raw of ['', '1.5', '0', '-3', '366', 'abc']) {
      expect(settingsApi.parseExpiringSoonDays(raw)).toMatch(/between 1 and 365/);
    }
  });
});
