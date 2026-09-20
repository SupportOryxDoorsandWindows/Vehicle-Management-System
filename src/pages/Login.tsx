import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const SET_PASSWORD_REDIRECT_URL =
  'https://supportoryxdoorsandwindows.github.io/Vehicle-Management-System/set-password';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? '/';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
    } else {
      navigate(from, { replace: true });
    }
  }

  async function handleForgotPassword() {
    const targetEmail = email || window.prompt('Enter your email to reset your password') || '';
    if (!targetEmail) return;
    setResetting(true);
    setError(null);
    setResetMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: SET_PASSWORD_REDIRECT_URL,
    });
    setResetting(false);
    if (error) {
      setError(error.message);
    } else {
      setResetMessage('Check your email for a reset link.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <form onSubmit={handleSubmit} className="w-full max-w-sm border border-oryx-silver rounded-lg p-6">
        <h1 className="text-xl font-bold text-oryx-blue mb-4">Oryx Vehicle Management</h1>
        <label htmlFor="email" className="block text-sm text-oryx-silver mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-oryx-silver rounded px-3 py-2 mb-3"
        />
        <label htmlFor="password" className="block text-sm text-oryx-silver mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border border-oryx-silver rounded px-3 py-2 mb-3"
        />
        {error && <p className="text-red-700 text-sm mb-3">{error}</p>}
        {resetMessage && <p className="text-oryx-blue text-sm mb-3">{resetMessage}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-oryx-blue text-white rounded px-3 py-2 disabled:opacity-50 mb-3"
        >
          Log in
        </button>
        <button
          type="button"
          onClick={handleForgotPassword}
          disabled={resetting}
          className="w-full text-sm text-oryx-blue underline disabled:opacity-50"
        >
          Forgot password?
        </button>
      </form>
    </div>
  );
}
