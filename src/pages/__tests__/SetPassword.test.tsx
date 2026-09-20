import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SetPassword } from '../SetPassword';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: { auth: { updateUser: vi.fn() } },
}));

describe('SetPassword', () => {
  it('submits the new password to updateUser and navigates to / on success', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: { user: {} },
      error: null,
    } as never);

    render(
      <MemoryRouter initialEntries={['/set-password']}>
        <Routes>
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/" element={<p>home page</p>} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/new password/i), 'newSecret123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'newSecret123');
    await userEvent.click(screen.getByRole('button', { name: /set password/i }));

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newSecret123' });
    expect(await screen.findByText('home page')).toBeInTheDocument();
  });

  it('shows an error from updateUser and does not navigate', async () => {
    vi.mocked(supabase.auth.updateUser).mockResolvedValue({
      data: { user: null },
      error: { message: 'Password is too weak' },
    } as never);

    render(
      <MemoryRouter initialEntries={['/set-password']}>
        <Routes>
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/" element={<p>home page</p>} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/new password/i), 'weak12');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'weak12');
    await userEvent.click(screen.getByRole('button', { name: /set password/i }));

    expect(await screen.findByText(/password is too weak/i)).toBeInTheDocument();
    expect(screen.queryByText('home page')).not.toBeInTheDocument();
  });

  it('shows an error and does not call updateUser when the passwords do not match', async () => {
    render(
      <MemoryRouter initialEntries={['/set-password']}>
        <Routes>
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/" element={<p>home page</p>} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.type(screen.getByLabelText(/new password/i), 'secret123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different123');
    await userEvent.click(screen.getByRole('button', { name: /set password/i }));

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });
});
