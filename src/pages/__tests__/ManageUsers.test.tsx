import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageUsers } from '../ManageUsers';
import * as profilesApi from '../../api/profiles';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

const profiles = [
  { id: 'u1', email: 'admin@oryxdoors.com', role: 'admin', active: true, created_at: '', updated_at: '' },
  { id: 'u2', email: 'viewer@oryxdoors.com', role: 'viewer', active: true, created_at: '', updated_at: '' },
];

beforeEach(() => {
  vi.spyOn(profilesApi, 'fetchProfiles').mockResolvedValue(profiles as never);
  vi.spyOn(profilesApi, 'updateProfileRole').mockResolvedValue(undefined);
  vi.spyOn(profilesApi, 'setProfileActive').mockResolvedValue(undefined);
  vi.mocked(useAuth).mockReturnValue({
    loading: false,
    profileLoading: false,
    session: { user: { id: 'u1' } },
    profile: profiles[0],
    signOut: vi.fn(),
  } as never);
});

describe('ManageUsers', () => {
  it('lists every user with their role and active status', async () => {
    render(<ManageUsers />);
    await waitFor(() => expect(screen.getByText('admin@oryxdoors.com')).toBeInTheDocument());
    expect(screen.getByText('viewer@oryxdoors.com')).toBeInTheDocument();
  });

  it('invites a new user via the Edge Function and refreshes the list', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { id: 'u3', email: 'new@oryxdoors.com', role: 'viewer' },
      error: null,
    } as never);

    render(<ManageUsers />);
    await waitFor(() => expect(screen.getByText('admin@oryxdoors.com')).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText(/invite email/i), 'new@oryxdoors.com');
    await userEvent.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() =>
      expect(supabase.functions.invoke).toHaveBeenCalledWith('invite-user', {
        body: { email: 'new@oryxdoors.com', role: 'viewer' },
      })
    );
    await waitFor(() => expect(profilesApi.fetchProfiles).toHaveBeenCalledTimes(2));
  });

  it('changes a user role via the role select', async () => {
    render(<ManageUsers />);
    await waitFor(() => expect(screen.getByText('viewer@oryxdoors.com')).toBeInTheDocument());

    const row = screen.getByText('viewer@oryxdoors.com').closest('tr')!;
    const { getByRole } = within(row);
    await userEvent.selectOptions(getByRole('combobox'), 'admin');

    await waitFor(() => expect(profilesApi.updateProfileRole).toHaveBeenCalledWith('u2', 'admin'));
  });

  it('deactivates a user on click', async () => {
    render(<ManageUsers />);
    await waitFor(() => expect(screen.getByText('viewer@oryxdoors.com')).toBeInTheDocument());

    const row = screen.getByText('viewer@oryxdoors.com').closest('tr')!;
    const { getByRole } = within(row);
    await userEvent.click(getByRole('button', { name: /deactivate/i }));

    expect(profilesApi.setProfileActive).toHaveBeenCalledWith('u2', false);
  });

  it("disables the role select and Deactivate button on the current user's own row, but not on other rows", async () => {
    render(<ManageUsers />);
    await waitFor(() => expect(screen.getByText('admin@oryxdoors.com')).toBeInTheDocument());

    const ownRow = screen.getByText('admin@oryxdoors.com').closest('tr')!;
    const otherRow = screen.getByText('viewer@oryxdoors.com').closest('tr')!;

    expect(within(ownRow).getByRole('combobox')).toBeDisabled();
    expect(within(ownRow).getByRole('button', { name: /deactivate/i })).toBeDisabled();

    expect(within(otherRow).getByRole('combobox')).not.toBeDisabled();
    expect(within(otherRow).getByRole('button', { name: /deactivate/i })).not.toBeDisabled();
  });

  it('shows an error when a role change fails, and reloads the list', async () => {
    vi.spyOn(profilesApi, 'updateProfileRole').mockRejectedValue(
      new Error("The change wasn't saved. Your account may no longer have admin access.")
    );
    render(<ManageUsers />);
    await waitFor(() => expect(screen.getByText('viewer@oryxdoors.com')).toBeInTheDocument());

    const row = screen.getByText('viewer@oryxdoors.com').closest('tr')!;
    await userEvent.selectOptions(within(row).getByRole('combobox'), 'admin');

    expect(await screen.findByRole('alert')).toHaveTextContent(/wasn't saved/);
    await waitFor(() => expect(profilesApi.fetchProfiles).toHaveBeenCalledTimes(2));
    // The select stays on the saved role rather than the attempted one.
    expect(within(row).getByRole('combobox')).toHaveValue('viewer');
  });

  it('shows an error when deactivating fails', async () => {
    vi.spyOn(profilesApi, 'setProfileActive').mockRejectedValue({ message: 'permission denied' });
    render(<ManageUsers />);
    await waitFor(() => expect(screen.getByText('viewer@oryxdoors.com')).toBeInTheDocument());

    const row = screen.getByText('viewer@oryxdoors.com').closest('tr')!;
    await userEvent.click(within(row).getByRole('button', { name: /deactivate/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('permission denied');
  });

  it('shows an error instead of an empty table when users fail to load', async () => {
    vi.spyOn(profilesApi, 'fetchProfiles').mockRejectedValue(new Error('JWT expired'));
    render(<ManageUsers />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't load users.");
    expect(alert).toHaveTextContent('JWT expired');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
