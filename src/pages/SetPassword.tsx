import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export function SetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setError(error.message);
    } else {
      navigate('/', { replace: true });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <form onSubmit={handleSubmit} className="w-full max-w-sm border border-oryx-silver rounded-lg p-6">
        <h1 className="text-xl font-bold text-oryx-blue mb-4">Set your password</h1>
        <label htmlFor="new-password" className="block text-sm text-oryx-silver mb-1">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full border border-oryx-silver rounded px-3 py-2 mb-3"
        />
        <label htmlFor="confirm-password" className="block text-sm text-oryx-silver mb-1">
          Confirm password
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          className="w-full border border-oryx-silver rounded px-3 py-2 mb-3"
        />
        {error && <p className="text-red-700 text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-oryx-blue text-white rounded px-3 py-2 disabled:opacity-50"
        >
          Set password
        </button>
      </form>
    </div>
  );
}
