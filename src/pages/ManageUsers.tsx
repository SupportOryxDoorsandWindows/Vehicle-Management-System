import { useEffect, useState, type FormEvent } from 'react';
import { fetchProfiles, updateProfileRole, setProfileActive } from '../api/profiles';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../types';

export function ManageUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'viewer'>('viewer');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  async function reload() {
    setProfiles(await fetchProfiles());
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    const { error } = await supabase.functions.invoke('invite-user', {
      body: { email: inviteEmail, role: inviteRole },
    });
    setInviting(false);
    if (error) {
      setInviteError(error.message);
      return;
    }
    setInviteEmail('');
    await reload();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-oryx-blue mb-4">Manage Users</h1>

      <form onSubmit={handleInvite} className="flex items-end gap-3 mb-6">
        <div>
          <label htmlFor="invite-email" className="block text-sm text-oryx-silver mb-1">
            Invite email
          </label>
          <input
            id="invite-email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            className="border border-oryx-silver rounded px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="invite-role" className="block text-sm text-oryx-silver mb-1">
            Role
          </label>
          <select
            id="invite-role"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'admin' | 'viewer')}
            className="border border-oryx-silver rounded px-3 py-2"
          >
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={inviting}
          className="bg-oryx-blue text-white rounded px-4 py-2 disabled:opacity-50"
        >
          Send invite
        </button>
      </form>
      {inviteError && <p className="text-red-700 text-sm mb-4">{inviteError}</p>}

      <table className="w-full text-left">
        <thead>
          <tr className="text-sm text-oryx-silver border-b border-oryx-silver">
            <th className="py-2">Email</th>
            <th className="py-2">Role</th>
            <th className="py-2">Status</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.id} className="border-b border-oryx-silver">
              <td className="py-2">{p.email}</td>
              <td className="py-2">
                <select
                  value={p.role}
                  onChange={async (e) => {
                    await updateProfileRole(p.id, e.target.value as 'admin' | 'viewer');
                    await reload();
                  }}
                  className="border border-oryx-silver rounded px-2 py-1"
                >
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td className="py-2">{p.active ? 'Active' : 'Inactive'}</td>
              <td className="py-2">
                <button
                  onClick={async () => {
                    await setProfileActive(p.id, !p.active);
                    await reload();
                  }}
                  className="underline text-oryx-blue"
                >
                  {p.active ? 'Deactivate' : 'Reactivate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
