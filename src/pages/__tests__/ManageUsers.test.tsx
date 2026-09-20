import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManageUsers } from '../ManageUsers';
import * as profilesApi from '../../api/profiles';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

const profiles = [
  { id: 'u1', email: 'admin@oryxdoors.com', role: 'admin', active: true, created_at: '', updated_at: '' },
  { id: 'u2', email: 'viewer@oryxdoors.com', role: 'viewer', active: true, created_at: '', updated_at: '' },
];

beforeEach(() => {
  vi.spyOn(profilesApi, 'fetchProfiles').mockResolvedValue(profiles as never);
  vi.spyOn(profilesApi, 'updateProfileRole').mockResolvedValue(undefined);
  vi.spyOn(profilesApi, 'setProfileActive').mockResolvedValue(undefined);
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
    expect(profilesApi.fetchProfiles).toHaveBeenCalledTimes(2);
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
});
